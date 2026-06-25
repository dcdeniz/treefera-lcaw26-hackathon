"""Cross-reference SAR alerts against Hansen 2023 loss (ADR-0005 — cross-reference, NOT truth)."""
from __future__ import annotations

import numpy as np
import rasterio
from rasterio.warp import Resampling, reproject

from . import config


def hansen_2023_on_grid(meta):
    """Reproject Hansen lossyear to the PALSAR grid; return loss2023 boolean mask."""
    dst = np.zeros((meta["height"], meta["width"]), "uint8")
    with rasterio.open(config.HANSEN) as src:
        reproject(
            source=rasterio.band(src, 1),
            destination=dst,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=meta["transform"],
            dst_crs=meta["crs"],
            resampling=Resampling.nearest,
        )
    return dst == config.HANSEN_LOSS_YEAR


def hansen_lossyear_on_grid(meta):
    """Reproject Hansen lossyear to the PALSAR grid (uint8: 0=no loss, n → year 2000+n)."""
    dst = np.zeros((meta["height"], meta["width"]), "uint8")
    with rasterio.open(config.HANSEN) as src:
        reproject(
            source=rasterio.band(src, 1),
            destination=dst,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=meta["transform"],
            dst_crs=meta["crs"],
            resampling=Resampling.nearest,
        )
    return dst


def hansen_year_mask(lossyear_grid, year):
    """Boolean mask of Hansen loss for one year (e.g. 2023 → lossyear == 23)."""
    return lossyear_grid == (year - 2000)


def metrics(alert_mask, hansen2023, valid):
    """Pixel-level agreement vs Hansen 2023. Reported as a *cross-reference* (ADR-0005):
    SAR-yes / Hansen-no is not automatically a false positive under persistent cloud."""
    a = alert_mask & valid
    h = hansen2023 & valid
    tp = int((a & h).sum())
    fp = int((a & ~h).sum())
    fn = int((~a & h).sum())
    ua = tp / (tp + fp) if (tp + fp) else 0.0   # users' accuracy ≈ precision vs Hansen
    pa = tp / (tp + fn) if (tp + fn) else 0.0   # producers' accuracy ≈ recall vs Hansen
    f1 = 2 * ua * pa / (ua + pa) if (ua + pa) else 0.0
    return {
        "users_accuracy": round(ua, 3),
        "producers_accuracy": round(pa, 3),
        "f1": round(f1, 3),
        "tp": tp, "fp": fp, "fn": fn,
        "hansen_2023_px": int(h.sum()),
        "alert_px": int(a.sum()),
        "note": "Hansen is optical (cloud-limited) — cross-reference, not ground truth (ADR-0005)",
    }
