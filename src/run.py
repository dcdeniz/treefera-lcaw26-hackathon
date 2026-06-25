"""End-to-end run: load → despeckle → detect → polygonize → validate → export.

    hackathon-demo/.venv/bin/python -m src.run
"""
from __future__ import annotations

import json

import numpy as np

from . import config, detect_change, export_payload, sar, validate


def main():
    config.ALERTS_DIR.mkdir(parents=True, exist_ok=True)
    config.WEB_DATA.mkdir(parents=True, exist_ok=True)

    print("· loading PALSAR HV (already dB; ADR-0003) …")
    hv22, meta = sar.load_hv(config.PALSAR_2022)
    hv23, _ = sar.load_hv(config.PALSAR_2023)
    print(f"  grid {meta['height']}×{meta['width']}  HV band {meta['hv_band']}  crs {meta['crs']}")

    print("· despeckling (Lee 7×7, linear domain) …")
    f22 = sar.despeckle(hv22, config.LEE_SIZE)
    f23 = sar.despeckle(hv23, config.LEE_SIZE)

    print("· reprojecting Hansen lossyear → grid …")
    hansen2023 = validate.hansen_2023_on_grid(meta)

    print(f"· detecting HV loss (Δ ≤ {config.DELTA_DB} dB) …")
    cleaned, delta, px_m2, min_pixels, masks = detect_change.detect(f22, f23, meta)
    print(f"  pixel≈{px_m2:.0f} m²  MMU {config.MMU_HA} ha = {min_pixels} px  "
          f"raw-alert {masks['raw_alert_pct']:.2f}%  components {masks['components']}")

    gdf = detect_change.polygonize(cleaned, delta, f22, hansen2023, meta, px_m2)
    print(f"  {len(gdf)} alert polygons")

    print("· validating vs Hansen 2023 (cross-reference; ADR-0005) …")
    valid = np.isfinite(hv22)
    aoi_area_ha = float(valid.sum()) * px_m2 / 10000.0
    m = validate.metrics(cleaned > 0, hansen2023, valid)
    m["alert_area_pct_of_aoi"] = round(100 * float((cleaned > 0).sum()) / float(valid.sum()), 2)
    # object-level precision: fraction of alert POLYGONS that touch a Hansen-2023 clearing
    # (fairer than pixel-level for an alert layer; ADR-0005).
    m["object_precision_vs_hansen"] = round(float(gdf["hansen_gfc_2023"].mean()), 3) if len(gdf) else 0.0
    print(f"  pixel: UA {m['users_accuracy']}  PA {m['producers_accuracy']}  F1 {m['f1']}  "
          f"| object-precision {m['object_precision_vs_hansen']}  "
          f"(alerts {m['alert_px']}px vs Hansen-2023 {m['hansen_2023_px']}px)")

    # --- outputs ---
    if len(gdf):
        gdf.to_file(config.ALERTS_DIR / "alerts_2023.geojson", driver="GeoJSON")
    (config.ALERTS_DIR / "validation_metrics.json").write_text(json.dumps(m, indent=2))

    payload = export_payload.build_payload(gdf, meta, m, aoi_area_ha)
    (config.WEB_DATA / "alerts.json").write_text(json.dumps(payload, indent=2))

    print(f"\n✓ alert_count {payload['summary']['alert_count']}  "
          f"area {payload['summary']['total_alert_area_ha']} ha  "
          f"({payload['summary']['alert_area_pct_of_aoi']}% of AOI {aoi_area_ha:.0f} ha)")
    print(f"  wrote {config.ALERTS_DIR}/alerts_2023.geojson, validation_metrics.json")
    print(f"  wrote {config.WEB_DATA}/alerts.json  (engineer's GET /api/alerts reads this)")
    return payload, m


if __name__ == "__main__":
    main()
