"""Masks, HV-loss detection, morphological clean, MMU, polygonize (BUILD_CONTRACT §3.7–3.10)."""
from __future__ import annotations

import math

import geopandas as gpd
import numpy as np
from rasterio import features
from scipy.ndimage import binary_closing, binary_opening, label
from shapely.geometry import shape

from . import config


def pixel_area_m2(meta):
    rx, ry = meta["res"]  # degrees (CRS is EPSG:4326)
    lat = (meta["bounds"].bottom + meta["bounds"].top) / 2.0
    m_per_deg_lat = 111320.0
    m_per_deg_lon = 111320.0 * math.cos(math.radians(lat))
    return abs(rx * m_per_deg_lon) * abs(ry * m_per_deg_lat)


def detect(hv22, hv23, meta):
    """Return (labelled cleaned alerts, delta raster, px_m2, min_pixels, masks dict)."""
    px_m2 = pixel_area_m2(meta)
    min_pixels = max(1, int(round(config.MMU_HA * 10000.0 / px_m2)))

    water = hv22 <= config.WATER_DB
    nonforest = hv22 < config.NONFOREST_DB
    delta = hv23 - hv22
    raw = (delta <= config.DELTA_DB) & ~water & ~nonforest & np.isfinite(delta)

    a = binary_opening(raw, structure=np.ones((3, 3)))
    a = binary_closing(a, structure=np.ones((3, 3)))
    lab, _ = label(a, structure=np.ones((3, 3)))  # 8-connectivity
    sizes = np.bincount(lab.ravel())
    keep = [i for i in range(1, len(sizes)) if sizes[i] >= min_pixels]
    cleaned = np.where(np.isin(lab, keep), lab, 0).astype("int32")

    masks = {
        "water_pct": float(np.nanmean(water) * 100),
        "nonforest_pct": float(np.nanmean(nonforest) * 100),
        "raw_alert_pct": float(np.nanmean(raw) * 100),
        "components": len(keep),
    }
    return cleaned, delta, px_m2, min_pixels, masks


def polygonize(cleaned, delta, hv22, hansen2023, meta, px_m2):
    rows = []
    valid_mask = cleaned > 0
    for geom, val in features.shapes(cleaned, mask=valid_mask, transform=meta["transform"]):
        cid = int(val)
        comp = cleaned == cid
        d = delta[comp]
        b = hv22[comp]
        n_px = int(comp.sum())
        area_ha = n_px * px_m2 / 10000.0
        mean_d = float(np.nanmean(d))
        rows.append({
            "geometry": shape(geom),
            "n_px": n_px,
            "area_ha": round(area_ha, 3),
            "mean_delta_hv_db": round(mean_d, 2),
            "min_delta_hv_db": round(float(np.nanmin(d)), 2),
            "baseline_hv_db": round(float(np.nanmean(b)), 2),
            "candidate_plantation_frontier": bool(
                area_ha >= config.FRONTIER_AREA_HA and mean_d <= config.FRONTIER_DELTA_DB
            ),
            "hansen_gfc_2023": bool(hansen2023[comp].any()),
        })
    return gpd.GeoDataFrame(rows, geometry="geometry", crs=meta["crs"])
