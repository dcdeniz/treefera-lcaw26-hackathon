"""Load PALSAR HV (already dB) and despeckle. Calibration is a no-op per ADR-0003."""
from __future__ import annotations

import numpy as np
import rasterio
from scipy.ndimage import uniform_filter


def load_hv(path):
    """Return (hv_db float32 with NaN nodata, meta dict). Picks the HV band."""
    with rasterio.open(path) as src:
        descs = [(d or "").upper() for d in (src.descriptions or [])]
        if "HV" in descs:
            band = descs.index("HV") + 1
        else:
            # Fallback: HV (cross-pol) has the lower median backscatter than HH.
            meds = []
            for b in range(1, src.count + 1):
                v = src.read(b).astype("float32")
                v = v[np.isfinite(v) & (v != 0)]
                meds.append(np.nanmedian(v) if v.size else np.inf)
            band = int(np.nanargmin(meds)) + 1
        hv = src.read(band).astype("float32")
        meta = {
            "transform": src.transform, "crs": src.crs,
            "height": src.height, "width": src.width,
            "res": src.res, "bounds": src.bounds, "hv_band": band,
        }
    # nodata = -inf and exact 0 (ADR-0003 / PALSAR gotchas)
    hv = np.where(np.isfinite(hv) & (hv != 0), hv, np.nan).astype("float32")
    return hv, meta


def _db2lin(db):
    return np.power(10.0, db / 10.0)


def _lin2db(p):
    return 10.0 * np.log10(np.where(p > 0, p, np.nan))


def lee_filter(img, size=7):
    """NaN-safe adaptive Lee on *linear* power (adapted from the demo notebook)."""
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


def despeckle(hv_db, size=7):
    """dB → linear → Lee → dB (speckle is multiplicative in linear space)."""
    return _lin2db(lee_filter(_db2lin(hv_db), size)).astype("float32")
