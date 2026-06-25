"""Sentinel-1 speckle filtering and backscatter features.

SAR backscatter carries multiplicative *speckle* — coherent-interference grain that
wrecks thresholding and classification. We convert dB -> linear power, apply an
adaptive Lee filter in linear space (filtering in dB/log space biases the result),
then convert back to dB. The Lee filter is adapted from Treefera demo notebook 03.

Features returned per pixel: despeckled VV, despeckled VH, and the VH-VV ratio (a dB
difference == log power ratio). VH (cross-pol) is the volume-scattering / vegetation
channel; the ratio separates structure from brightness.
"""
from __future__ import annotations

import numpy as np
from scipy.ndimage import uniform_filter


def db_to_linear(db):
    return 10.0 ** (db / 10.0)


def linear_to_db(power):
    return 10.0 * np.log10(np.where(power > 0, power, np.nan))


def lee_filter(img, size=7):
    """Adaptive Lee speckle filter on *linear* backscatter (NaN-safe).

    Each output pixel blends toward the local mean by a weight set by local vs global
    variance: smooth in uniform areas (kills speckle), keep the original near edges.
    """
    img = img.astype("float32")
    nan = ~np.isfinite(img)
    filled = np.where(nan, 0.0, img)
    valid = (~nan).astype("float32")

    count = uniform_filter(valid, size)
    count[count == 0] = np.nan
    local_mean = uniform_filter(filled, size) / count
    local_sqr = uniform_filter(filled ** 2, size) / count
    local_var = np.clip(local_sqr - local_mean ** 2, 0, None)

    overall_var = np.nanvar(img)
    weight = local_var / (local_var + overall_var)
    out = local_mean + weight * (np.where(nan, local_mean, img) - local_mean)
    out[nan] = np.nan
    return out


def despeckle_db(db, size=7):
    """dB -> linear -> Lee filter -> dB."""
    return linear_to_db(lee_filter(db_to_linear(db), size=size))


def sar_features(vv_db, vh_db, size=7):
    """Return (3, H, W): despeckled VV (dB), VH (dB), and VH-VV ratio (dB)."""
    vv = despeckle_db(vv_db, size=size)
    vh = despeckle_db(vh_db, size=size)
    ratio = vh - vv
    return np.stack([vv, vh, ratio], axis=0)
