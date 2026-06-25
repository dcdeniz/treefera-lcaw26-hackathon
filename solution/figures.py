"""All output figures. Pure functions: arrays in, PNG out."""
from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import ListedColormap
from matplotlib.patches import Patch

from .sar import db_to_linear, despeckle_db


def _hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))


def colorize(classmap, colors):
    """Map a class-code raster to an RGB image via the ESRI palette (0 -> white)."""
    rgb = np.ones((*classmap.shape, 3), dtype="float32")
    for code, hexc in colors.items():
        rgb[classmap == code] = _hex2rgb(hexc)
    return rgb


def fig_aef_pca(aef, out):
    """64-D AEF embeddings -> first 3 PCs -> RGB false colour."""
    b, h, w = aef.shape
    flat = aef.reshape(b, -1).T
    valid = np.isfinite(flat).all(axis=1)
    X = flat[valid] - flat[valid].mean(0)
    _, _, vt = np.linalg.svd(X, full_matrices=False)
    pcs = X @ vt[:3].T
    rgb = np.full((h * w, 3), np.nan, "float32")
    lo, hi = np.percentile(pcs, [2, 98], axis=0)
    rgb[valid] = np.clip((pcs - lo) / (hi - lo), 0, 1)
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.imshow(np.nan_to_num(rgb.reshape(h, w, 3), nan=1.0))
    ax.set_title("AlphaEarth embeddings (PCA → RGB)")
    ax.axis("off")
    fig.savefig(out, dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_sar_despeckle(vv_db, out):
    vmin, vmax = np.nanpercentile(vv_db, [2, 98])
    filt = despeckle_db(vv_db, size=7)
    fig, ax = plt.subplots(1, 2, figsize=(12, 6))
    ax[0].imshow(vv_db, cmap="gray", vmin=vmin, vmax=vmax)
    ax[0].set_title("Sentinel-1 VV — raw (dB)")
    ax[1].imshow(filt, cmap="gray", vmin=vmin, vmax=vmax)
    ax[1].set_title("VV — Lee-despeckled (dB)")
    for a in ax:
        a.axis("off")
    fig.suptitle("SAR speckle filtering (the cloud-penetrating spine)", y=0.96)
    fig.savefig(out, dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_landcover(true_map, pred_map, names, colors, out):
    fig, ax = plt.subplots(1, 2, figsize=(13, 6.5))
    ax[0].imshow(colorize(true_map, colors))
    ax[0].set_title("ESRI land cover — truth")
    ax[1].imshow(colorize(pred_map, colors))
    ax[1].set_title("Predicted from AEF + SAR")
    present = sorted(c for c in colors if (true_map == c).any() or (pred_map == c).any())
    legend = [Patch(facecolor=_hex2rgb(colors[c]), label=names[c]) for c in present]
    for a in ax:
        a.axis("off")
    fig.legend(handles=legend, loc="lower center", ncol=len(legend), frameon=False)
    fig.suptitle("Land cover: embeddings + SAR reproduce the map", y=0.98)
    fig.savefig(out, dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_confusion(res, names, out):
    from sklearn.metrics import confusion_matrix

    labels = sorted(np.unique(res["y_true"]))
    cm = confusion_matrix(res["y_true"], res["y_pred"], labels=labels)
    cmn = cm / cm.sum(1, keepdims=True).clip(1)
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    im = ax.imshow(cmn, cmap="Blues", vmin=0, vmax=1)
    ax.set_xticks(range(len(labels)), [names[l] for l in labels], rotation=45, ha="right")
    ax.set_yticks(range(len(labels)), [names[l] for l in labels])
    for i in range(len(labels)):
        for j in range(len(labels)):
            ax.text(j, i, f"{cmn[i, j]:.2f}", ha="center", va="center",
                    color="white" if cmn[i, j] > 0.5 else "black", fontsize=8)
    ax.set_xlabel("predicted"); ax.set_ylabel("true")
    ax.set_title(f"Confusion (spatial CV) — acc {res['accuracy']:.2f}, macroF1 {res['macro_f1']:.2f}")
    fig.colorbar(im, fraction=0.046)
    fig.savefig(out, dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_cv_gap(random_res, spatial_res, out):
    """The money shot: random CV inflates skill — and the damage hides in macro-F1.

    Overall accuracy barely moves (a dominant easy class carries it), but macro-F1
    (which weights every class equally) collapses under spatial CV — that gap is the
    leakage you'd otherwise have reported as real skill on the minority classes.
    """
    metrics = ["accuracy", "macro_f1"]
    rnd = [random_res[m] for m in metrics]
    spa = [spatial_res[m] for m in metrics]
    x = np.arange(len(metrics))
    w = 0.35
    fig, ax = plt.subplots(figsize=(6.5, 5))
    b1 = ax.bar(x - w / 2, rnd, w, label="random CV (leaks!)", color="#c4281b")
    b2 = ax.bar(x + w / 2, spa, w, label="spatial-block CV (honest)", color="#397d49")
    for bars, vals in [(b1, rnd), (b2, spa)]:
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v + 0.01, f"{v:.2f}", ha="center", fontsize=10)
    ax.set_xticks(x, ["accuracy", "macro-F1"])
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("score")
    ax.legend(loc="lower left")
    ax.set_title("Random CV overstates skill — the damage is in macro-F1")
    fig.savefig(out, dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_sar_value(ablation, out):
    """The finding: raw SAR adds ~0 on top of AEF, because AlphaEarth already fuses
    Sentinel-1 into the embedding. SAR's value is therefore *temporal* (cloud-proof
    change detection), not static classification skill."""
    fig, ax = plt.subplots(figsize=(6.2, 5))
    vals = [ablation["aef_only_acc"], ablation["fused_acc"]]
    bars = ax.bar(["AEF only", "AEF + raw SAR"], vals, color=["#7a87c6", "#397d49"])
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v + 0.005, f"{v:.3f}", ha="center", fontsize=12)
    ax.set_ylim(0, 1)
    ax.set_ylabel("spatial-CV accuracy")
    ax.set_title(f"Raw SAR on top of AEF: Δ = {ablation['delta_acc']:+.3f} (≈ 0)")
    ax.annotate(
        "AlphaEarth already fuses Sentinel-1 →\nthe embedding *subsumes* the radar.\n"
        "SAR's real value is temporal:\ncloud-proof change detection.",
        xy=(0.5, 0.35), xycoords="axes fraction", ha="center", fontsize=9,
        bbox=dict(boxstyle="round", fc="#fff6e5", ec="#e49635"),
    )
    fig.savefig(out, dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_importance(clf, feat_names, n_aef, out, top=15):
    imp = clf.feature_importances_
    order = np.argsort(imp)[::-1][:top]
    fig, ax = plt.subplots(figsize=(7, 5))
    colors = ["#397d49" if i >= n_aef else "#7a87c6" for i in order]
    ax.barh([feat_names[i] for i in order][::-1], imp[order][::-1], color=colors[::-1])
    ax.set_title("Top feature importances (green = SAR, purple = AEF)")
    ax.set_xlabel("importance")
    fig.savefig(out, dpi=130, bbox_inches="tight")
    plt.close(fig)
