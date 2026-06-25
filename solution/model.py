"""Train and honestly evaluate the land-cover model on AEF (+ SAR) features.

RandomForest: robust on 64+ correlated features, scale-invariant (so the normalised
AEF vectors need no preprocessing), fast on CPU. Two things are measured:

  1. random-CV vs spatial-CV accuracy  -> the leakage / honesty gap
  2. AEF-only vs AEF+SAR (spatial CV)   -> whether cloud-penetrating SAR adds skill
"""
from __future__ import annotations

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import GroupKFold, StratifiedKFold


def _rf():
    return RandomForestClassifier(
        n_estimators=300, n_jobs=-1, class_weight="balanced", random_state=0
    )


def cross_val(X, y, groups, mode="spatial", n_splits=5):
    """Out-of-fold prediction under spatial (GroupKFold) or random (StratifiedKFold) CV."""
    if mode == "spatial":
        folds = GroupKFold(n_splits=n_splits).split(X, y, groups)
    else:
        folds = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=0).split(X, y)

    yt, yp = [], []
    for tr, te in folds:
        clf = _rf().fit(X[tr], y[tr])
        yt.append(y[te])
        yp.append(clf.predict(X[te]))
    yt, yp = np.concatenate(yt), np.concatenate(yp)
    return {
        "mode": mode,
        "accuracy": float(accuracy_score(yt, yp)),
        "macro_f1": float(f1_score(yt, yp, average="macro")),
        "y_true": yt,
        "y_pred": yp,
    }


def feature_ablation(ds, n_splits=5):
    """Spatial-CV accuracy for AEF-only vs AEF+SAR — does SAR fusion help?"""
    X, y, g = ds["X"], ds["y"], ds["blocks"]
    aef_only = cross_val(X[:, ds["aef_cols"]], y, g, "spatial", n_splits)
    fused = cross_val(X, y, g, "spatial", n_splits)
    return {
        "aef_only_acc": aef_only["accuracy"],
        "fused_acc": fused["accuracy"],
        "aef_only_f1": aef_only["macro_f1"],
        "fused_f1": fused["macro_f1"],
        "delta_acc": fused["accuracy"] - aef_only["accuracy"],
    }


def fit_full(ds):
    """Fit on all valid pixels (for the visualised map + feature importances)."""
    clf = _rf().fit(ds["X"], ds["y"])
    return clf


def predicted_map(clf, ds):
    """Scatter predictions back onto the (H, W) grid; 0 where invalid."""
    H, W = ds["shape"]
    out = np.zeros(H * W, dtype="uint8")
    out[ds["valid"]] = clf.predict(ds["X"]).astype("uint8")
    return out.reshape(H, W)
