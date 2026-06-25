"""Export georeferenced web overlays for the Next.js map demo.

Reprojects every model output to EPSG:4326, writes transparent PNGs + a manifest
(bounds, legend, metrics) into solution/webapp/public/data/. Rotated UTM corners
become transparent (RGBA alpha=0) so each overlay drops cleanly onto a web map.

    hackathon-demo/.venv/bin/python -m solution.export_web
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import numpy as np
import rioxarray  # noqa: F401  registers .rio
import xarray as xr
from matplotlib import colormaps
from matplotlib import image as mpimg
from rasterio.enums import Resampling

from . import io_data, model
from .features import build_dataset
from .figures import _hex2rgb
from .sar import despeckle_db

WEB = Path(__file__).resolve().parent / "webapp" / "public" / "data"


def _da(ref, values, bands=None):
    if bands is None:
        da = xr.DataArray(np.asarray(values, "float32"), dims=("y", "x"),
                          coords={"y": ref.y, "x": ref.x})
    else:
        da = xr.DataArray(np.asarray(values, "float32"), dims=("band", "y", "x"),
                          coords={"band": bands, "y": ref.y, "x": ref.x})
    return da.rio.write_crs(ref.rio.crs).rio.set_spatial_dims(x_dim="x", y_dim="y")


def _bounds(da):
    w, s, e, n = da.rio.bounds()
    return {"west": float(w), "south": float(s), "east": float(e), "north": float(n)}


def main():
    WEB.mkdir(parents=True, exist_ok=True)
    names, colors = io_data.load_classes()
    aef_da = rioxarray.open_rasterio(io_data.AEF_PATH, masked=True).astype("float32")

    arrays = io_data.load_aligned()
    ds = build_dataset(arrays)
    clf = model.fit_full(ds)
    pred = model.predicted_map(clf, ds)
    truth = arrays["lulc"]

    layers = {}

    # categorical: truth + predicted
    for key, cmap in [("predicted", pred), ("truth", truth)]:
        d = _da(aef_da, cmap).rio.reproject("EPSG:4326", resampling=Resampling.nearest)
        codes = np.rint(np.where(np.isfinite(d.values), d.values, 0)).astype("int32")
        rgba = np.zeros((*codes.shape, 4), "float32")
        for code, hexc in colors.items():
            m = codes == code
            rgba[m, :3] = _hex2rgb(hexc)
            rgba[m, 3] = 1.0
        mpimg.imsave(WEB / f"{key}.png", np.clip(rgba, 0, 1))
        layers[key] = _bounds(d)

    # AEF embeddings -> PCA RGB
    aef = arrays["aef"]
    b, H, W = aef.shape
    flat = aef.reshape(b, -1).T
    valid = np.isfinite(flat).all(1)
    X = flat[valid] - flat[valid].mean(0)
    _, _, vt = np.linalg.svd(X, full_matrices=False)
    pcs = np.full((H * W, 3), np.nan, "float32")
    pcs[valid] = X @ vt[:3].T
    pcs = pcs.reshape(H, W, 3).transpose(2, 0, 1)
    d = _da(aef_da, pcs, bands=[0, 1, 2]).rio.reproject("EPSG:4326", resampling=Resampling.bilinear)
    rgb = np.moveaxis(d.values, 0, -1)
    finite = np.isfinite(rgb).all(-1)
    lo, hi = np.nanpercentile(rgb, [2, 98], axis=(0, 1))
    rgba = np.zeros((*finite.shape, 4), "float32")
    rgba[..., :3] = np.nan_to_num(np.clip((rgb - lo) / (hi - lo + 1e-9), 0, 1))
    rgba[..., 3] = finite
    mpimg.imsave(WEB / "embeddings.png", np.clip(rgba, 0, 1))
    layers["embeddings"] = _bounds(d)

    # SAR VV despeckled -> viridis
    vv = despeckle_db(arrays["vv"], size=7)
    d = _da(aef_da, vv).rio.reproject("EPSG:4326", resampling=Resampling.bilinear)
    v = d.values
    finite = np.isfinite(v)
    lo, hi = np.nanpercentile(v, [2, 98])
    rgba = colormaps["viridis"](np.nan_to_num(np.clip((v - lo) / (hi - lo + 1e-9), 0, 1)))
    rgba[..., 3] = finite
    mpimg.imsave(WEB / "sar.png", np.clip(rgba, 0, 1))
    layers["sar"] = _bounds(d)

    # AOI outline + metrics + manifest
    shutil.copy(io_data.BOUNDARY_PATH, WEB / "aoi.geojson")
    metrics = json.loads((Path(__file__).resolve().parent / "outputs" / "metrics.json").read_text())
    legend = [{"code": int(c), "name": names[c], "hex": colors[c]}
              for c in sorted(colors) if (truth == c).any() or (pred == c).any()]
    cen = layers["predicted"]
    manifest = {
        "aoi": "D_Chablis_Vineyard — Burgundy, France",
        "center": [(cen["west"] + cen["east"]) / 2, (cen["south"] + cen["north"]) / 2],
        "layers": layers,
        "legend": legend,
        "metrics": metrics,
    }
    (WEB / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print("wrote overlays + manifest to", WEB)


if __name__ == "__main__":
    main()
