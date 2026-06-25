"""Render PALSAR HV + HV-loss as georeferenced transparent PNG overlays for the
isometric MapLibre GIS viewer (web/public/qgis/). Offline (geo venv), in the spirit of
solution/export_web.py. Reuses the verified src/ load+despeckle so the imagery matches
the detector exactly.

  hackathon-demo/.venv/bin/python web/scripts/render_overlays.py
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from src import config, sar  # noqa: E402

OUT = os.path.join(config.REPO, "web", "public", "qgis")
os.makedirs(OUT, exist_ok=True)

HV_STRETCH = (-16.0, -6.0)  # γ0 dB → grayscale (QGIS singleband-gray default look)
LOSS_DB = (-7.0, -0.5)      # show backscatter DROP only; |Δ| ramps red→yellow


def gray_png(db, path, lo, hi):
    t = np.clip((db - lo) / (hi - lo), 0.0, 1.0)
    g = (t * 255).astype("uint8")
    a = np.where(np.isfinite(db), 255, 0).astype("uint8")
    Image.fromarray(np.dstack([g, g, g, a]), "RGBA").save(path)


def loss_png(delta, path, dmax, thresh):
    valid = np.isfinite(delta) & (delta <= thresh)
    t = np.clip(delta / dmax, 0.0, 1.0)          # 0 (no loss) … 1 (max loss)
    r = np.full_like(t, 255.0)
    g = 210.0 * (1.0 - t)                         # red (strong loss) → orange/yellow (mild)
    b = 40.0 * (1.0 - t)
    a = np.where(valid, 60 + 175 * t, 0.0)        # stronger loss = more opaque
    rgba = np.dstack([r, g, b, np.where(valid, a, 0)]).astype("uint8")
    Image.fromarray(rgba, "RGBA").save(path)


def clouds_png(shape, path, seed=7):
    """Procedural cloud cover (fractal noise) over the AOI — the optical blind-spot
    SAR sees through. Soft white blobs with a transparent floor."""
    from scipy.ndimage import gaussian_filter

    h, w = shape
    rng = np.random.default_rng(seed)
    field = np.zeros((h, w), "float32")
    for octave in range(5):
        s = 2 ** octave
        n = rng.standard_normal((h, w)).astype("float32")
        field += gaussian_filter(n, sigma=max(2.0, 30.0 / s)) * (1.0 / s)
    field -= field.min()
    field /= field.max() + 1e-9
    dens = np.clip((field - 0.40) / 0.42, 0.0, 1.0) ** 1.25  # emphasise distinct blobs
    alpha = (dens * 240).astype("uint8")
    white = np.full((h, w), 249, "uint8")
    rgba = np.dstack([white, white, np.full((h, w), 252, "uint8"), alpha])
    Image.fromarray(rgba, "RGBA").save(path)


def main():
    hv22, meta = sar.load_hv(config.PALSAR_2022)
    hv23, _ = sar.load_hv(config.PALSAR_2023)
    f22 = sar.despeckle(hv22, config.LEE_SIZE)
    f23 = sar.despeckle(hv23, config.LEE_SIZE)
    delta = f23 - f22

    gray_png(f22, os.path.join(OUT, "hv_2022.png"), *HV_STRETCH)
    gray_png(f23, os.path.join(OUT, "hv_2023.png"), *HV_STRETCH)
    loss_png(delta, os.path.join(OUT, "loss.png"), LOSS_DB[0], LOSS_DB[1])
    clouds_png((meta["height"], meta["width"]), os.path.join(OUT, "clouds.png"))

    b = meta["bounds"]
    metrics = json.load(open(os.path.join(config.ALERTS_DIR, "validation_metrics.json")))
    # MapLibre image-source corner order: TL, TR, BR, BL
    manifest = {
        "bounds": {"west": b.left, "south": b.bottom, "east": b.right, "north": b.top},
        "coordinates": [[b.left, b.top], [b.right, b.top], [b.right, b.bottom], [b.left, b.bottom]],
        "center": [(b.left + b.right) / 2.0, (b.bottom + b.top) / 2.0],
        "size_px": [meta["width"], meta["height"]],
        "layers": {
            "hv_2022": {"label": "PALSAR HV 2022 (γ⁰ dB)", "stretch_db": list(HV_STRETCH)},
            "hv_2023": {"label": "PALSAR HV 2023 (γ⁰ dB)", "stretch_db": list(HV_STRETCH)},
            "loss": {"label": "HV loss Δ (dB)", "range_db": list(LOSS_DB)},
            "clouds": {"label": "Cloud cover (optical blind-spot)"},
        },
        "metrics": metrics,
    }
    with open(os.path.join(OUT, "overlays_manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print("rendered →", OUT)
    for f in ("hv_2022.png", "hv_2023.png", "loss.png", "clouds.png", "overlays_manifest.json"):
        p = os.path.join(OUT, f)
        print(f"  {f}: {os.path.getsize(p)} B")


if __name__ == "__main__":
    main()
