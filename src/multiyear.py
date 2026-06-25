"""Multi-year deforestation detection — the 2018→2024 scrubber data.

Runs the same 2-date Δ-detector (ADR-0001..0009) over every consecutive PALSAR year-pair
(2017-18 … 2023-24) → per-year alert polygons, each validated against that year's Hansen lossyear
→ one multi-frame `AlertsPayload` for the scrubber. Each alert carries a `year` (its loss year);
`payload.frames[]` holds the per-year summary + validation for the timeline.

    hackathon-demo/.venv/bin/python -m src.multiyear
"""
from __future__ import annotations

import json

import geopandas as gpd
import numpy as np
import pandas as pd

from . import config, detect_change, export_payload, sar, validate


def run_pair(year_a, year_b, lossyear_cache):
    hv_a, meta = sar.load_hv(config.palsar_path(year_a))
    hv_b, _ = sar.load_hv(config.palsar_path(year_b))
    if hv_a.shape != hv_b.shape:
        raise ValueError(f"grid mismatch {year_a}{hv_a.shape} vs {year_b}{hv_b.shape}")
    fa = sar.despeckle(hv_a, config.LEE_SIZE)
    fb = sar.despeckle(hv_b, config.LEE_SIZE)

    key = (meta["height"], meta["width"])
    if key not in lossyear_cache:
        lossyear_cache[key] = validate.hansen_lossyear_on_grid(meta)
    hansen_y = validate.hansen_year_mask(lossyear_cache[key], year_b)

    cleaned, delta, px_m2, min_pixels, masks = detect_change.detect(fa, fb, meta)
    gdf = detect_change.polygonize(cleaned, delta, fa, hansen_y, meta, px_m2)
    valid = np.isfinite(hv_a)
    m = validate.metrics(cleaned > 0, hansen_y, valid)
    m["alert_area_pct_of_aoi"] = round(100 * float((cleaned > 0).sum()) / float(valid.sum()), 2)
    m["object_precision_vs_hansen"] = round(float(gdf["hansen_gfc_2023"].mean()), 3) if len(gdf) else 0.0
    aoi_area_ha = float(valid.sum()) * px_m2 / 10000.0
    return gdf, m, meta, aoi_area_ha


def main():
    config.ALERTS_DIR.mkdir(parents=True, exist_ok=True)
    config.WEB_DATA.mkdir(parents=True, exist_ok=True)
    years = config.PALSAR_YEARS
    pairs = list(zip(years[:-1], years[1:]))   # (2017,2018) … (2023,2024)
    print(f"· multi-year run over {len(pairs)} pairs: {pairs}")

    cache, all_alerts, frames, frame_gdfs = {}, [], [], []
    last_meta = None
    for ya, yb in pairs:
        gdf, m, meta, aoi_ha = run_pair(ya, yb, cache)
        last_meta = meta
        gdf["year"] = yb
        frame_gdfs.append(gdf)
        payload = export_payload.build_payload(gdf, meta, m, aoi_ha, year=yb)
        all_alerts.extend(payload["alerts"])
        frames.append({
            "year": yb,
            "alert_count": payload["summary"]["alert_count"],
            "total_alert_area_ha": payload["summary"]["total_alert_area_ha"],
            "alert_area_pct_of_aoi": payload["summary"]["alert_area_pct_of_aoi"],
            "validation": payload["summary"]["validation"],
            "object_precision_vs_hansen": m["object_precision_vs_hansen"],
        })
        if len(gdf):
            gdf.to_file(config.ALERTS_DIR / f"alerts_{yb}.geojson", driver="GeoJSON")
        (config.ALERTS_DIR / f"validation_metrics_{yb}.json").write_text(json.dumps(m, indent=2))
        print(f"  {ya}->{yb}: {payload['summary']['alert_count']:3d} alerts  "
              f"{payload['summary']['total_alert_area_ha']:7.1f} ha  "
              f"F1 {m['f1']:.2f}  objP {m['object_precision_vs_hansen']:.2f}")

    b = last_meta["bounds"]
    aoi = {
        "bbox": [round(b.left, 4), round(b.bottom, 4), round(b.right, 4), round(b.top, 4)],
        "name": "Central Kalimantan SAR-through-clouds hotspot",
        "centre": [round((b.bottom + b.top) / 2, 4), round((b.left + b.right) / 2, 4)],
    }
    default_frame = max(frames, key=lambda f: f["alert_count"])  # land on the richest year
    payload = {
        "aoi": aoi,
        "summary": {  # default frame, so single-year consumers still get sensible headline numbers
            "alert_count": default_frame["alert_count"],
            "total_alert_area_ha": default_frame["total_alert_area_ha"],
            "alert_area_pct_of_aoi": default_frame["alert_area_pct_of_aoi"],
            "validation": default_frame["validation"],
        },
        "frames": frames,
        "alerts": all_alerts,
        "default_year": default_frame["year"],
        "year_range": [frames[0]["year"], frames[-1]["year"]],
    }
    # combined multi-year geojson for the geographic viewer (map.html filters by `year`)
    qgis_dir = config.REPO / "web" / "public" / "qgis"
    qgis_dir.mkdir(parents=True, exist_ok=True)
    allgdf = gpd.GeoDataFrame(pd.concat(frame_gdfs, ignore_index=True), crs=frame_gdfs[0].crs)
    allgdf.to_file(qgis_dir / "alerts_all.geojson", driver="GeoJSON")
    (qgis_dir / "frames.json").write_text(json.dumps({
        "frames": frames,
        "default_year": default_frame["year"],
        "year_range": [frames[0]["year"], frames[-1]["year"]],
    }, indent=2))
    print(f"  wrote {qgis_dir}/alerts_all.geojson ({len(allgdf)} features) + frames.json")

    (config.WEB_DATA / "alerts.json").write_text(json.dumps(payload, indent=2))

    total = sum(f["alert_count"] for f in frames)
    print(f"\n✓ {total} alerts across {len(frames)} frames ({frames[0]['year']}-{frames[-1]['year']})")
    print(f"  wrote {config.WEB_DATA}/alerts.json (multi-frame) + per-year geojson/metrics")
    print("  per-frame:", json.dumps([{f['year']: f['alert_count']} for f in frames]))


if __name__ == "__main__":
    main()
