"""Spatial cross-validation — the honesty layer.

Pixels are spatially autocorrelated (Tobler's law), so a *random* train/test split
leaks: held-out pixels sit next to training pixels and the model interpolates rather
than generalises, inflating the score. We tile the scene into square blocks and keep
whole blocks within a fold (GroupKFold), so test blocks are spatially disjoint from
training. The gap between random-CV and spatial-CV accuracy is the leakage you'd
otherwise have reported as real skill.
"""
from __future__ import annotations

import numpy as np


def block_ids(shape, n_blocks=8):
    """Assign each pixel a spatial-block id over an n_blocks x n_blocks grid."""
    h, w = shape
    by = (np.arange(h) * n_blocks // h)[:, None]
    bx = (np.arange(w) * n_blocks // w)[None, :]
    return (by * n_blocks + bx).astype("int32")  # (H, W)
