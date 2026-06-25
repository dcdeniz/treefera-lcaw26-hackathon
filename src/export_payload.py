"""Map alert polygons → the frontend's AlertsPayload (web/src/lib/types.ts).

centroid is normalised to [0,1] within the DATA bounds (the hotspot, not the wide bbox),
y-up (north = 1) — see conversations/0003. Each alert is optionally tagged with `year` (its loss
year) for the multi-year scrubber. The fake per-alert `delta_series` was removed (conv 0015/0016).
"""
from __future__ import annotations


def _norm(c, lo, hi):
    return round(float((c - lo) / (hi - lo)), 4) if hi > lo else 0.0


def build_payload(gdf, meta, metrics, aoi_area_ha, year=None):
    b = meta["bounds"]
    cent = gdf.geometry.centroid
    alerts = []
    for i, (_, row) in enumerate(gdf.iterrows()):
        mean_d = float(row["mean_delta_hv_db"])
        a = {
            "id": f"a_{i + 1:04d}" if year is None else f"a_{year}_{i + 1:04d}",
            "centroid": [_norm(cent.iloc[i].x, b.left, b.right),
                         _norm(cent.iloc[i].y, b.bottom, b.top)],  # y-up: north=1
            "area_ha": float(row["area_ha"]),
            "mean_delta_hv_db": mean_d,
            "min_delta_hv_db": float(row["min_delta_hv_db"]),
            "baseline_hv_db": float(row["baseline_hv_db"]),
            "candidate_plantation_frontier": bool(row["candidate_plantation_frontier"]),
            "cross_checks": {
                "hansen_gfc_2023": bool(row["hansen_gfc_2023"]),
                "radd_2023": False,        # no local RADD (EE fallback only)
                "spot_visual": "unclear",  # SPOT not auto-labelled
            },
        }
        if year is not None:
            a["year"] = year
        alerts.append(a)

    total_area = round(sum(a["area_ha"] for a in alerts), 1)
    summary = {
        "alert_count": len(alerts),
        "total_alert_area_ha": total_area,
        "alert_area_pct_of_aoi": round(100 * total_area / aoi_area_ha, 2) if aoi_area_ha else 0.0,
        "validation": {
            "users_accuracy": metrics["users_accuracy"],
            "producers_accuracy": metrics["producers_accuracy"],
            "f1": metrics["f1"],
        },
    }
    aoi = {
        "bbox": [round(b.left, 4), round(b.bottom, 4), round(b.right, 4), round(b.top, 4)],
        "name": "Central Kalimantan SAR-through-clouds hotspot",
        "centre": [round((b.bottom + b.top) / 2, 4), round((b.left + b.right) / 2, 4)],  # [lat, lon]
    }
    return {"aoi": aoi, "summary": summary, "alerts": alerts}
