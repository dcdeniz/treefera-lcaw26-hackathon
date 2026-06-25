"""Through-the-Clouds — PALSAR HV two-date change detection (BUILD_CONTRACT §3.4-3.10).

This is a faithful, dependency-light port of the proven `src/` pipeline so it can run
*inside the QGIS-MCP container's Python* (driven over MCP via the ttc_detect_change
recipe's execute_python step). It is numerically identical to src/sar.py +
src/detect_change.py + src/validate.py.

Two execution paths, ONE shared numeric core (numpy + scipy):
  • Recipe/container: a `params` dict and a `result` dict are injected by the QGIS
    bridge's execute_python; raster IO uses osgeo.gdal/ogr (always present in QGIS).
  • Local validation:  `python mcp/config/detect.py` uses DEFAULTS (real-data paths)
    and rasterio/geopandas (the repo venv), so the port can be diffed against the
    committed outputs/alerts/alerts_2023.geojson BEFORE relying on the container.

Calibration is a no-op: PALSAR from GEE is already gamma0 dB (ADR-0003).
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np

try:                                              # container core
    from scipy.ndimage import binary_closing, binary_opening, label, uniform_filter
except Exception:                                 # pragma: no cover - bootstrap in QGIS image
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "--break-system-packages",
                    "-q", "scipy"], check=False)
    from scipy.ndimage import binary_closing, binary_opening, label, uniform_filter

# Backend selection: gdal in the container, rasterio locally.
try:
    from osgeo import gdal, ogr, osr      # noqa: F401
    gdal.UseExceptions()
    _BACKEND = "gdal"
except Exception:
    _BACKEND = "rasterio"

# __file__ is undefined when this module is exec()'d inside the QGIS bridge; fall back
# to cwd. REPO is only used by DEFAULTS (the local-validation path), never in-container.
try:
    REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
except NameError:
    REPO = os.getcwd()
DEFAULTS = {
    "run_id": "local_validation",
    "palsar_a": os.path.join(REPO, "real-data/palsar_gee/G_sar_borneo/annual/2022/palsar_G_sar_borneo_2022.tif"),
    "palsar_b": os.path.join(REPO, "real-data/palsar_gee/G_sar_borneo/annual/2023/palsar_G_sar_borneo_2023.tif"),
    "hansen": os.path.join(REPO, "real-data/hansen_lossyear/G_sar_borneo/hansen-lossyear_G_sar_borneo_2024.tif"),
    "out_dir": os.path.join(REPO, "mcp/outputs/local_validation"),
    "delta_db": -2.5, "water_db": -24.0, "nonforest_db": -14.0,
    "mmu_ha": 0.2, "frontier_area_ha": 1.0, "frontier_delta_db": -3.0,
    "lee": 7, "hansen_loss_year": 23,
}

# ── shared numeric core (identical to src/) ────────────────────────────────────

def _db2lin(db):
    return np.power(10.0, db / 10.0)


def _lin2db(p):
    return 10.0 * np.log10(np.where(p > 0, p, np.nan))


def _lee(img, size):
    """NaN-safe adaptive Lee on linear power (== src/sar.lee_filter)."""
    nan = ~np.isfinite(img)
    filled = np.where(nan, 0.0, img)
    valid = (~nan).astype("float32")
    cnt = uniform_filter(valid, size)
    cnt[cnt == 0] = np.nan
    lmean = uniform_filter(filled, size) / cnt
    lsqr = uniform_filter(filled ** 2, size) / cnt
    lvar = np.clip(lsqr - lmean ** 2, 0, None)
    ovar = np.nanvar(img)
    w = lvar / (lvar + ovar)
    out = lmean + w * (np.where(nan, lmean, img) - lmean)
    out[nan] = np.nan
    return out


def _despeckle(db, size):
    return _lin2db(_lee(_db2lin(db), size)).astype("float32")


def _pixel_area_m2(gt_xres, gt_yres, lat_centre):
    m_per_deg_lat = 111320.0
    m_per_deg_lon = 111320.0 * math.cos(math.radians(lat_centre))
    return abs(gt_xres * m_per_deg_lon) * abs(gt_yres * m_per_deg_lat)


def _detect(f22, f23, p):
    """Masks → Δ-threshold → morphology → connected components (== src/detect_change.detect)."""
    water = f22 <= p["water_db"]
    nonforest = f22 < p["nonforest_db"]
    delta = f23 - f22
    raw = (delta <= p["delta_db"]) & ~water & ~nonforest & np.isfinite(delta)
    a = binary_opening(raw, structure=np.ones((3, 3)))
    a = binary_closing(a, structure=np.ones((3, 3)))
    lab, _ = label(a, structure=np.ones((3, 3)))  # 8-connectivity
    return lab, delta


# ── IO backends ────────────────────────────────────────────────────────────────

def _read_hv_gdal(path):
    ds = gdal.Open(path)
    band = None
    for i in range(1, ds.RasterCount + 1):
        if "HV" in (ds.GetRasterBand(i).GetDescription() or "").upper():
            band = i
            break
    if band is None:
        meds = []
        for i in range(1, ds.RasterCount + 1):
            v = ds.GetRasterBand(i).ReadAsArray().astype("float32")
            v = v[np.isfinite(v) & (v != 0)]
            meds.append(np.nanmedian(v) if v.size else np.inf)
        band = int(np.nanargmin(meds)) + 1
    arr = ds.GetRasterBand(band).ReadAsArray().astype("float32")
    arr = np.where(np.isfinite(arr) & (arr != 0), arr, np.nan).astype("float32")
    gt = ds.GetGeoTransform()
    meta = {"gt": gt, "proj": ds.GetProjection(), "w": ds.RasterXSize, "h": ds.RasterYSize,
            "xres": gt[1], "yres": gt[5], "originx": gt[0], "originy": gt[3], "band": band}
    return arr, meta


def _read_hv_rio(path):
    import rasterio
    with rasterio.open(path) as src:
        descs = [(d or "").upper() for d in (src.descriptions or [])]
        if "HV" in descs:
            band = descs.index("HV") + 1
        else:
            meds = []
            for b in range(1, src.count + 1):
                v = src.read(b).astype("float32")
                v = v[np.isfinite(v) & (v != 0)]
                meds.append(np.nanmedian(v) if v.size else np.inf)
            band = int(np.nanargmin(meds)) + 1
        arr = src.read(band).astype("float32")
        t = src.transform
        meta = {"transform": t, "crs": src.crs, "w": src.width, "h": src.height,
                "xres": t.a, "yres": t.e, "originx": t.c, "originy": t.f, "band": band,
                "bounds": src.bounds}
    arr = np.where(np.isfinite(arr) & (arr != 0), arr, np.nan).astype("float32")
    return arr, meta


def _hansen_gdal(path, meta, loss_year):
    gt, w, h = meta["gt"], meta["w"], meta["h"]
    bounds = (gt[0], gt[3] + h * gt[5], gt[0] + w * gt[1], gt[3])  # (minx,miny,maxx,maxy)
    warped = gdal.Warp("", path, format="MEM", width=w, height=h,
                       outputBounds=bounds, resampleAlg="near")
    return (warped.GetRasterBand(1).ReadAsArray() == loss_year).astype("uint8")


def _hansen_rio(path, meta, loss_year):
    import rasterio
    from rasterio.warp import Resampling, reproject
    dst = np.zeros((meta["h"], meta["w"]), "uint8")
    with rasterio.open(path) as src:
        reproject(source=rasterio.band(src, 1), destination=dst,
                  src_transform=src.transform, src_crs=src.crs,
                  dst_transform=meta["transform"], dst_crs=meta["crs"],
                  resampling=Resampling.nearest)
    return (dst == loss_year).astype("uint8")


def _polygons_gdal(cleaned, meta):
    """Yield (component_id, ogr_geometry_wkb) for each labelled blob."""
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    mem_r = gdal.GetDriverByName("MEM").Create("", meta["w"], meta["h"], 1, gdal.GDT_Int32)
    mem_r.SetGeoTransform(meta["gt"])
    mem_r.SetProjection(meta["proj"] or srs.ExportToWkt())
    mem_r.GetRasterBand(1).WriteArray(cleaned)
    band = mem_r.GetRasterBand(1)
    mem_v = ogr.GetDriverByName("Memory").CreateDataSource("m")
    lyr = mem_v.CreateLayer("c", srs=srs, geom_type=ogr.wkbPolygon)
    lyr.CreateField(ogr.FieldDefn("comp", ogr.OFTInteger))
    gdal.Polygonize(band, band, lyr, 0, [], callback=None)  # band as its own mask → skip 0
    for feat in lyr:
        cid = feat.GetField("comp")
        if cid:
            yield cid, feat.GetGeometryRef().Clone()


def _write_geojson_gdal(path, rows, meta):
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    drv = ogr.GetDriverByName("GeoJSON")
    if os.path.exists(path):
        drv.DeleteDataSource(path)
    ds = drv.CreateDataSource(path)
    lyr = ds.CreateLayer("alerts_2023", srs=srs, geom_type=ogr.wkbPolygon)
    fields = [("n_px", ogr.OFTInteger), ("area_ha", ogr.OFTReal),
              ("mean_delta_hv_db", ogr.OFTReal), ("min_delta_hv_db", ogr.OFTReal),
              ("baseline_hv_db", ogr.OFTReal),
              ("candidate_plantation_frontier", ogr.OFTInteger),
              ("hansen_gfc_2023", ogr.OFTInteger)]
    for nm, tp in fields:
        lyr.CreateField(ogr.FieldDefn(nm, tp))
    defn = lyr.GetLayerDefn()
    for r in rows:
        f = ogr.Feature(defn)
        f.SetGeometry(r["geom"])
        for nm, _ in fields:
            f.SetField(nm, r[nm])
        lyr.CreateFeature(f)
        f = None
    ds = None


def _write_geojson_rio(path, rows, meta):
    import geopandas as gpd
    from shapely.geometry import shape
    recs = [{**{k: r[k] for k, _ in [
        ("n_px", 0), ("area_ha", 0), ("mean_delta_hv_db", 0), ("min_delta_hv_db", 0),
        ("baseline_hv_db", 0), ("candidate_plantation_frontier", 0), ("hansen_gfc_2023", 0)]},
        "geometry": shape(r["geom"])} for r in rows]
    gdf = gpd.GeoDataFrame(recs, geometry="geometry", crs="EPSG:4326")
    if len(gdf):
        gdf.to_file(path, driver="GeoJSON")


# ── orchestration ────────────────────────────────────────────────────────────

def run(p):
    out_dir = p.get("out_dir") or ("/data/outputs/" + p["run_id"])
    os.makedirs(out_dir, exist_ok=True)
    out_geojson = os.path.join(out_dir, "alerts_2023.geojson")

    if _BACKEND == "gdal":
        hv22, meta = _read_hv_gdal(p["palsar_a"])
        hv23, _ = _read_hv_gdal(p["palsar_b"])
    else:
        hv22, meta = _read_hv_rio(p["palsar_a"])
        hv23, _ = _read_hv_rio(p["palsar_b"])

    f22 = _despeckle(hv22, int(p["lee"]))
    f23 = _despeckle(hv23, int(p["lee"]))

    lat_c = meta["originy"] + (meta["h"] / 2.0) * meta["yres"]
    px_m2 = _pixel_area_m2(meta["xres"], meta["yres"], lat_c)
    min_px = max(1, int(round(p["mmu_ha"] * 10000.0 / px_m2)))

    lab, delta = _detect(f22, f23, p)
    sizes = np.bincount(lab.ravel())
    keep = [i for i in range(1, len(sizes)) if sizes[i] >= min_px]
    cleaned = np.where(np.isin(lab, keep), lab, 0).astype("int32")

    if _BACKEND == "gdal":
        hansen = _hansen_gdal(p["hansen"], meta, int(p["hansen_loss_year"]))
        poly_iter = _polygons_gdal(cleaned, meta)
    else:
        hansen = _hansen_rio(p["hansen"], meta, int(p["hansen_loss_year"]))
        poly_iter = _polygons_rio(cleaned, meta)

    rows = []
    for cid, geom in poly_iter:
        comp = cleaned == cid
        n_px = int(comp.sum())
        if n_px < min_px:
            continue
        d = delta[comp]
        b = f22[comp]
        # Frontier classification uses FULL-precision area & mean (== src/detect_change.py);
        # rounding is for STORAGE only. Rounding before the check would misclassify
        # borderline alerts (e.g. 0.9995 ha → round→1.0 ≥ 1.0).
        area_full = n_px * px_m2 / 10000.0
        mean_full = float(np.nanmean(d))
        rows.append({
            "geom": geom, "n_px": n_px, "area_ha": round(area_full, 3),
            "mean_delta_hv_db": round(mean_full, 2),
            "min_delta_hv_db": round(float(np.nanmin(d)), 2),
            "baseline_hv_db": round(float(np.nanmean(b)), 2),
            "candidate_plantation_frontier": int(
                area_full >= p["frontier_area_ha"] and mean_full <= p["frontier_delta_db"]),
            "hansen_gfc_2023": int(bool(hansen[comp].any())),
        })

    if _BACKEND == "gdal":
        _write_geojson_gdal(out_geojson, rows, meta)
    else:
        _write_geojson_rio(out_geojson, rows, meta)

    # cross-reference metrics vs Hansen 2023 (pixel-level; ADR-0005 — NOT ground truth)
    valid = np.isfinite(hv22)
    valid_n = float(valid.sum())  # guard: an all-NaN/empty AOI must not ZeroDivision
    alert = (cleaned > 0) & valid
    h = hansen.astype(bool) & valid
    tp = int((alert & h).sum())
    fp = int((alert & ~h).sum())
    fn = int((~alert & h).sum())
    ua = round(tp / (tp + fp), 3) if (tp + fp) else 0.0
    pa = round(tp / (tp + fn), 3) if (tp + fn) else 0.0
    f1 = round(2 * ua * pa / (ua + pa), 3) if (ua + pa) else 0.0
    aoi_area_ha = valid_n * px_m2 / 10000.0
    total_area = round(sum(r["area_ha"] for r in rows), 3)
    metrics = {
        "users_accuracy": ua, "producers_accuracy": pa, "f1": f1,
        "tp": tp, "fp": fp, "fn": fn,
        "hansen_2023_px": int(h.sum()), "alert_px": int(alert.sum()),
        "alert_area_pct_of_aoi": round(100 * float(alert.sum()) / valid_n, 2) if valid_n else 0.0,
        "object_precision_vs_hansen": round(
            np.mean([r["hansen_gfc_2023"] for r in rows]), 3) if rows else 0.0,
        "note": "Hansen is optical (cloud-limited) — cross-reference, not ground truth (ADR-0005)",
    }
    import json
    with open(os.path.join(out_dir, "validation_metrics.json"), "w") as fh:
        json.dump(metrics, fh, indent=2)

    return {
        "success": True, "backend": _BACKEND, "run_id": p["run_id"],
        "alerts_count": len(rows), "out_geojson": out_geojson,
        "out_dir": out_dir, "px_m2": round(px_m2, 1), "min_pixels": min_px,
        "hv_band": meta["band"], "aoi_area_ha": round(aoi_area_ha, 1),
        "total_alert_area_ha": total_area, "metrics": metrics,
    }


def _polygons_rio(cleaned, meta):
    from rasterio import features
    for geom, val in features.shapes(cleaned, mask=cleaned > 0, transform=meta["transform"]):
        yield int(val), geom  # geom is a GeoJSON dict; _write_geojson_rio handles via shape()


# Recipe exec path: the QGIS bridge injects `params` and `result`.
try:
    _injected = params  # type: ignore[name-defined]  # noqa: F821
except NameError:
    _injected = None
if isinstance(_injected, dict):
    _summary = run(_injected)
    try:
        result.update(_summary)  # type: ignore[name-defined]  # noqa: F821
    except NameError:
        pass


if __name__ == "__main__":
    import json
    print(json.dumps(run(DEFAULTS), indent=2, default=str))
