"""End-to-end run: load -> co-register -> fuse -> spatially-validate -> figures + metrics.

    ./.venv/bin/python -m solution.run

Outputs land in solution/outputs/.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np

from . import figures as F
from . import io_data, model
from .features import build_dataset

OUT = Path(__file__).resolve().parent / "outputs"


def main():
    OUT.mkdir(exist_ok=True)
    t0 = time.time()
    names, colors = io_data.load_classes()

    print("· loading + co-registering products onto the AEF grid …")
    arrays = io_data.load_aligned()
    H, W = arrays["shape"]
    print(f"  grid {H}×{W}  crs {arrays['crs']}")

    print("· building fused feature matrix (AEF 64 + SAR 3) …")
    ds = build_dataset(arrays, n_blocks=8, despeckle_size=7)
    print(f"  {ds['X'].shape[0]:,} valid pixels × {ds['X'].shape[1]} features")

    print("· cross-validating (random vs spatial) …")
    rnd = model.cross_val(ds["X"], ds["y"], ds["blocks"], "random")
    spa = model.cross_val(ds["X"], ds["y"], ds["blocks"], "spatial")
    print(f"  random  acc {rnd['accuracy']:.3f}  |  spatial acc {spa['accuracy']:.3f}"
          f"  (leakage {rnd['accuracy'] - spa['accuracy']:+.3f})")

    print("· SAR ablation (AEF-only vs AEF+SAR, spatial CV) …")
    abl = model.feature_ablation(ds)
    print(f"  AEF {abl['aef_only_acc']:.3f}  ->  AEF+SAR {abl['fused_acc']:.3f}"
          f"  (Δ {abl['delta_acc']:+.3f})")

    print("· fitting full model for map + importances …")
    clf = model.fit_full(ds)
    pred = model.predicted_map(clf, ds)

    # forest detection (Trees vs rest) under honest spatial CV — the deforestation target
    from sklearn.metrics import precision_score, recall_score

    fc = io_data.FOREST_CLASS
    yt, yp = spa["y_true"] == fc, spa["y_pred"] == fc
    forest = {
        "precision": float(precision_score(yt, yp, zero_division=0)),
        "recall": float(recall_score(yt, yp, zero_division=0)),
    }
    print(f"  forest (Trees) spatial-CV: precision {forest['precision']:.3f}  recall {forest['recall']:.3f}")

    # carbon-relevant summary: forest extent + Hansen loss in-scene
    forest_px = int((arrays["lulc"] == fc).sum())
    loss_px = int((arrays["hansen"] > 0).sum())

    print("· writing figures …")
    F.fig_aef_pca(arrays["aef"], OUT / "01_aef_pca.png")
    F.fig_sar_despeckle(arrays["vv"], OUT / "02_sar_despeckle.png")
    F.fig_landcover(arrays["lulc"], pred, names, colors, OUT / "03_landcover.png")
    F.fig_confusion(spa, names, OUT / "04_confusion_spatial.png")
    F.fig_cv_gap(rnd, spa, OUT / "05_cv_gap.png")
    F.fig_sar_value(abl, OUT / "06_sar_value.png")
    F.fig_importance(clf, ds["feat_names"], ds["n_aef"], OUT / "07_importance.png")

    metrics = {
        "grid": [H, W],
        "valid_pixels": int(ds["X"].shape[0]),
        "n_features": int(ds["X"].shape[1]),
        "random_cv": {"accuracy": rnd["accuracy"], "macro_f1": rnd["macro_f1"]},
        "spatial_cv": {"accuracy": spa["accuracy"], "macro_f1": spa["macro_f1"]},
        "leakage_accuracy": rnd["accuracy"] - spa["accuracy"],
        "sar_ablation": abl,
        "forest_detection_spatial_cv": forest,
        "forest_pixels": forest_px,
        "hansen_loss_pixels": loss_px,
        "runtime_sec": round(time.time() - t0, 1),
    }
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"\n✓ done in {metrics['runtime_sec']}s — outputs in {OUT}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
