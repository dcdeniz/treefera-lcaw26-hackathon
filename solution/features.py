"""Assemble the per-pixel feature matrix from the co-registered stack.

Features = 64 AEF embedding dims + 3 SAR features (VV, VH, VH-VV ratio).
AEF vectors are L2-normalised (unit hypersphere) so we do NOT standardise them; a
tree model is scale-invariant anyway. A pixel is kept only if every feature is finite
and it has a real LULC label (code != 0 nodata).
"""
from __future__ import annotations

import numpy as np

from .sar import sar_features
from .spatial_cv import block_ids


def build_dataset(arrays, n_blocks=8, despeckle_size=7):
    aef = arrays["aef"]                                    # (64, H, W)
    sar = sar_features(arrays["vv"], arrays["vh"], despeckle_size)  # (3, H, W)
    lulc = arrays["lulc"]                                  # (H, W)
    H, W = arrays["shape"]
    n_aef = aef.shape[0]

    feats = np.concatenate([aef, sar], axis=0)             # (67, H, W)
    X_all = feats.reshape(feats.shape[0], -1).T            # (H*W, 67)
    y_all = lulc.reshape(-1)                               # (H*W,)
    blocks = block_ids((H, W), n_blocks).reshape(-1)       # (H*W,)

    valid = np.isfinite(X_all).all(axis=1) & (y_all != 0)
    feat_names = [f"aef_{i:02d}" for i in range(n_aef)] + ["sar_vv", "sar_vh", "sar_ratio"]

    return {
        "X": X_all[valid].astype("float32"),
        "y": y_all[valid].astype("int64"),
        "blocks": blocks[valid],
        "valid": valid,                 # (H*W,) bool — to scatter predictions back
        "shape": (H, W),
        "feat_names": feat_names,
        "n_aef": n_aef,
        "aef_cols": np.arange(n_aef),
        "sar_cols": np.arange(n_aef, n_aef + 3),
    }
