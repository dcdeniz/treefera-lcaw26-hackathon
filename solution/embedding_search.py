"""Few-shot forest mapping via AlphaEarth embedding similarity (our data only).

AEF vectors are L2-normalised, so cosine similarity to a forest *prototype* (the mean
embedding of a few labelled forest pixels) ranks forest pixels with almost no labels.
That label-efficiency is the property that makes label-scarce regions (the tropics)
tractable. We evaluate on a spatially held-out split and trace the label-efficiency curve.

    hackathon-demo/.venv/bin/python -m solution.embedding_search
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (average_precision_score, f1_score,
                             precision_recall_curve, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import GroupKFold

from . import io_data
from .features import build_dataset
from .figures import _hex2rgb

OUT = Path(__file__).resolve().parent / "outputs"
FC = io_data.FOREST_CLASS
RNG = np.random.default_rng(0)


def best_threshold(y, score):
    p, r, th = precision_recall_curve(y, score)
    f1 = 2 * p * r / (p + r + 1e-9)
    return th[max(0, int(np.argmax(f1[:-1])))]


def main():
    OUT.mkdir(exist_ok=True)
    names, colors = io_data.load_classes()
    arrays = io_data.load_aligned()
    ds = build_dataset(arrays)
    X, y, g = ds["X"], ds["y"], ds["blocks"]
    Xa = X[:, ds["aef_cols"]]            # AEF only, L2-normalised rows
    yf = y == FC

    tr, te = next(GroupKFold(5).split(X, y, g))    # one spatial split
    Xtr, Xte, ytr, yte = Xa[tr], Xa[te], yf[tr], yf[te]
    forest_idx = np.where(ytr)[0]

    def detect(take):
        proto = Xtr[take].mean(0)
        proto /= np.linalg.norm(proto) + 1e-12
        s_tr, s_te = Xtr @ proto, Xte @ proto
        thr = best_threshold(ytr, s_tr)
        return s_te, (s_te >= thr), proto

    # full prototype (all train forest)
    s_te, pred, proto_full = detect(forest_idx)
    full = {
        "roc_auc": float(roc_auc_score(yte, s_te)),
        "pr_auc": float(average_precision_score(yte, s_te)),
        "forest_f1": float(f1_score(yte, pred)),
        "forest_precision": float(precision_score(yte, pred, zero_division=0)),
        "forest_recall": float(recall_score(yte, pred, zero_division=0)),
        "n_train_forest_available": int(ytr.sum()),
    }

    # label-efficiency: k random forest exemplars, averaged over draws
    ks = [5, 10, 25, 50, 100, 250, len(forest_idx)]
    eff = []
    for k in ks:
        kk = min(k, len(forest_idx))
        f1s = [f1_score(yte, detect(RNG.choice(forest_idx, kk, replace=False))[1]) for _ in range(5)]
        eff.append({"k": kk, "f1_mean": float(np.mean(f1s)), "f1_std": float(np.std(f1s))})

    # supervised RF ceiling (AEF-only forest-F1), if available
    cj = OUT / "sar_comparison.json"
    rf_ceiling = json.loads(cj.read_text())["AEF only (64)"]["forest_f1"] if cj.exists() else None

    print("FULL-PROTOTYPE forest detector (1 prototype, 0 training):")
    print(json.dumps(full, indent=2))
    print("LABEL-EFFICIENCY (forest-F1 on held-out blocks):")
    for e in eff:
        print(f"  k={e['k']:>4} forest-F1 {e['f1_mean']:.3f} ± {e['f1_std']:.3f}")
    if rf_ceiling:
        print(f"  supervised RF ceiling forest-F1 = {rf_ceiling:.3f}")

    # --- figure 1: similarity map + forest@thr vs truth ---
    H, W = ds["shape"]
    sim_all = Xa @ proto_full
    smap = np.full(H * W, np.nan)
    smap[ds["valid"]] = sim_all
    smap = smap.reshape(H, W)
    thr_all = best_threshold(ytr, Xtr @ proto_full)
    pmap = np.zeros(H * W, "uint8")
    pmap[ds["valid"]] = (sim_all >= thr_all).astype("uint8")
    pmap = pmap.reshape(H, W)
    truth = arrays["lulc"]

    def fmask(b):
        rgb = np.ones((*b.shape, 3))
        rgb[b] = _hex2rgb(colors[FC])
        rgb[~b] = (0.16, 0.18, 0.17)
        return rgb

    fig, ax = plt.subplots(1, 3, figsize=(15, 5))
    im = ax[0].imshow(smap, cmap="viridis")
    ax[0].set_title("cosine similarity to forest prototype")
    fig.colorbar(im, ax=ax[0], fraction=0.046)
    ax[1].imshow(fmask(pmap == 1))
    ax[1].set_title("forest @ threshold (few-shot)")
    ax[2].imshow(fmask(truth == FC))
    ax[2].set_title("forest — truth")
    for a in ax:
        a.axis("off")
    fig.suptitle("Few-shot forest from AlphaEarth similarity — no model trained", y=0.98)
    fig.savefig(OUT / "10_embedding_similarity.png", dpi=130, bbox_inches="tight")
    plt.close(fig)

    # --- figure 2: label-efficiency curve ---
    fig, ax = plt.subplots(figsize=(7, 5))
    xs = [e["k"] for e in eff]
    ys = [e["f1_mean"] for e in eff]
    es = [e["f1_std"] for e in eff]
    ax.errorbar(xs, ys, yerr=es, marker="o", color="#397d49", capsize=3, label="few-shot similarity")
    if rf_ceiling:
        ax.axhline(rf_ceiling, ls="--", color="#7a87c6", label=f"supervised RF ({rf_ceiling:.2f})")
    ax.set_xscale("log")
    ax.set_xlabel("# labelled forest pixels (prototype)")
    ax.set_ylabel("forest-F1 (held-out blocks)")
    ax.set_ylim(0, 1)
    ax.legend()
    ax.set_title("Label efficiency: forest from a handful of clicks")
    fig.savefig(OUT / "11_label_efficiency.png", dpi=130, bbox_inches="tight")
    plt.close(fig)

    (OUT / "embedding_search.json").write_text(json.dumps({"full": full, "efficiency": eff, "rf_ceiling": rf_ceiling}, indent=2))
    print("wrote 10_embedding_similarity.png, 11_label_efficiency.png, embedding_search.json")


if __name__ == "__main__":
    main()
