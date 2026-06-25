"""Multi-year PALSAR HV + per-year deforestation alerts for the temporal scrubber.
Reuses the proven src/ detector. Outputs to web/public/qgis/ts/.

  hackathon-demo/.venv/bin/python web/scripts/render_timeseries.py
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
import rasterio
from PIL import Image
from rasterio.warp import Resampling, reproject

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from src import config, detect_change, sar  # noqa: E402

OUT = os.path.join(config.REPO, "web", "public", "qgis", "ts")
os.makedirs(OUT, exist_ok=True)
YEARS = list(range(2017, 2025))  # 2017..2024 (8 annual PALSAR HV mosaics)
HV_STRETCH = (-16.0, -6.0)


def gray_png(db, path, lo=HV_STRETCH[0], hi=HV_STRETCH[1]):
    t = np.clip((db - lo) / (hi - lo), 0.0, 1.0)
    g = (t * 255).astype("uint8")
    a = np.where(np.isfinite(db), 255, 0).astype("uint8")
    Image.fromarray(np.dstack([g, g, g, a]), "RGBA").save(path)


def hansen_raw_on_grid(meta):
    dst = np.zeros((meta["height"], meta["width"]), "uint8")
    with rasterio.open(config.HANSEN) as src:
        reproject(source=rasterio.band(src, 1), destination=dst, src_transform=src.transform,
                  src_crs=src.crs, dst_transform=meta["transform"], dst_crs=meta["crs"],
                  resampling=Resampling.nearest)
    return dst


def palsar_path(y):
    return config.DATA / f"palsar_gee/G_sar_borneo/annual/{y}/palsar_G_sar_borneo_{y}.tif"


def main():
    import geopandas as gpd
    import pandas as pd

    hv, meta = {}, None
    for y in YEARS:
        arr, m = sar.load_hv(palsar_path(y))
        if meta is None:
            meta = m
        hv[y] = sar.despeckle(arr, config.LEE_SIZE)
        gray_png(hv[y], os.path.join(OUT, f"hv_{y}.png"))

    hraw = hansen_raw_on_grid(meta)
    parts, per_year = [], {}
    for y in YEARS[1:]:  # loss detected in year y (pair y-1 → y)
        cleaned, delta, px_m2, _min, _masks = detect_change.detect(hv[y - 1], hv[y], meta)
        hansen_y = (hraw == (y - 2000))
        gdf = detect_change.polygonize(cleaned, delta, hv[y - 1], hansen_y, meta, px_m2)
        if len(gdf):
            gdf = gdf.copy()
            gdf["year"] = y
            parts.append(gdf)
        per_year[y] = {"count": int(len(gdf)),
                       "area_ha": round(float(gdf["area_ha"].sum()) if len(gdf) else 0.0, 1)}

    geo = os.path.join(OUT, "alerts_timeseries.geojson")
    if parts:
        allg = gpd.GeoDataFrame(pd.concat(parts, ignore_index=True), crs=meta["crs"])
        if os.path.exists(geo):
            os.remove(geo)
        allg.to_file(geo, driver="GeoJSON")

    b = meta["bounds"]
    manifest = {
        "years": YEARS,
        "detect_years": YEARS[1:],
        "coordinates": [[b.left, b.top], [b.right, b.top], [b.right, b.bottom], [b.left, b.bottom]],
        "bounds": {"west": b.left, "south": b.bottom, "east": b.right, "north": b.top},
        "per_year": per_year,
        "hv_stretch_db": list(HV_STRETCH),
    }
    json.dump(manifest, open(os.path.join(OUT, "ts_manifest.json"), "w"), indent=2)
    print("per-year loss alerts:")
    for y in YEARS[1:]:
        print(f"  {y}: {per_year[y]}")
    print("→", geo)


if __name__ == "__main__":
    main()
