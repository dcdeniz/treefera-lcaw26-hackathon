"""Does Sentinel-1 SAR *alone* recover land cover / forest?

Spatial-block CV on our own Chablis demo data only. Compares a majority-class baseline,
SAR-only (3 features), AEF-only (64), and AEF+SAR (67), plus a SAR-only forest map vs truth.

    hackathon-demo/.venv/bin/python -m solution.compare_sar
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import GroupKFold

from . import io_data
from .features import build_dataset
from .figures import _hex2rgb

OUT = Path(__file__).resolve().parent / "outputs"
FC = io_data.FOREST_CLASS  # ESRI "Trees" = 2


def oof_predict(X, y, groups, n_splits=5, n_estimators=250):
    yp = np.zeros_like(y)
    for tr, te in GroupKFold(n_splits).split(X, y, groups):
        clf = RandomForestClassifier(
            n_estimators=n_estimators, n_jobs=-1, class_weight="balanced", random_state=0
        ).fit(X[tr], y[tr])
        yp[te] = clf.predict(X[te])
    return yp


def scores(y, yp):
    return {
        "accuracy": float(accuracy_score(y, yp)),
        "macro_f1": float(f1_score(y, yp, average="macro")),
        "forest_precision": float(precision_score(y == FC, yp == FC, zero_division=0)),
        "forest_recall": float(recall_score(y == FC, yp == FC, zero_division=0)),
        "forest_f1": float(f1_score(y == FC, yp == FC, zero_division=0)),
    }


def main():
    OUT.mkdir(exist_ok=True)
    names, colors = io_data.load_classes()
    arrays = io_data.load_aligned()
    ds = build_dataset(arrays)
    X, y, g = ds["X"], ds["y"], ds["blocks"]
    aef, sar = ds["aef_cols"], ds["sar_cols"]

    runs = {}
    runs["baseline (majority)"] = scores(y, np.full_like(y, np.bincount(y).argmax()))
    runs["SAR only (3)"] = scores(y, oof_predict(X[:, sar], y, g))
    runs["AEF only (64)"] = scores(y, oof_predict(X[:, aef], y, g))
    runs["AEF + SAR (67)"] = scores(y, oof_predict(X, y, g))

    print(f"{'model':<22}{'acc':>7}{'macroF1':>9}{'forP':>7}{'forR':>7}{'forF1':>7}")
    for k, s in runs.items():
        print(f"{k:<22}{s['accuracy']:>7.3f}{s['macro_f1']:>9.3f}"
              f"{s['forest_precision']:>7.3f}{s['forest_recall']:>7.3f}{s['forest_f1']:>7.3f}")

    # figure 1: grouped bars
    labels = list(runs)
    x = np.arange(len(labels))
    w = 0.26
    fig, ax = plt.subplots(figsize=(8.5, 5))
    ax.bar(x - w, [runs[k]["accuracy"] for k in labels], w, label="accuracy", color="#7a87c6")
    ax.bar(x, [runs[k]["macro_f1"] for k in labels], w, label="macro-F1", color="#e49635")
    ax.bar(x + w, [runs[k]["forest_f1"] for k in labels], w, label="forest-F1", color="#397d49")
    ax.set_xticks(x, labels, rotation=15, ha="right")
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("score (spatial CV)")
    ax.legend()
    ax.set_title("Does SAR alone recover land cover / forest? — Chablis, spatial CV")
    fig.savefig(OUT / "08_sar_vs_aef_comparison.png", dpi=130, bbox_inches="tight")
    plt.close(fig)

    # figure 2: SAR-only forest vs truth
    clf = RandomForestClassifier(
        n_estimators=250, n_jobs=-1, class_weight="balanced", random_state=0
    ).fit(X[:, sar], y)
    H, W = ds["shape"]
    pm = np.zeros(H * W, "uint8")
    pm[ds["valid"]] = clf.predict(X[:, sar]).astype("uint8")
    pm = pm.reshape(H, W)
    truth = arrays["lulc"]

    def forest_rgb(cm):
        rgb = np.ones((*cm.shape, 3))
        rgb[(cm != FC) & (cm != 0)] = (0.16, 0.18, 0.17)
        rgb[cm == FC] = _hex2rgb(colors[FC])
        return rgb

    fig, axx = plt.subplots(1, 2, figsize=(12, 6))
    axx[0].imshow(forest_rgb(truth))
    axx[0].set_title("Forest — truth (ESRI Trees)")
    axx[1].imshow(forest_rgb(pm))
    axx[1].set_title("Forest — SAR-only prediction")
    for a in axx:
        a.axis("off")
    fig.suptitle("SAR alone vs truth — forest extent", y=0.97)
    fig.savefig(OUT / "09_sar_only_forest.png", dpi=130, bbox_inches="tight")
    plt.close(fig)

    (OUT / "sar_comparison.json").write_text(json.dumps(runs, indent=2))
    print("wrote 08_sar_vs_aef_comparison.png, 09_sar_only_forest.png, sar_comparison.json")


if __name__ == "__main__":
    main()
