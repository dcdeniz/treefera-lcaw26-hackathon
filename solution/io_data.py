"""Load and co-register the Chablis (France) products onto one common grid.

All four products cover the same AOI but differ in CRS and resolution:

    AEF embeddings   EPSG:32631 (UTM, m)   64-band      <- reference grid
    Sentinel-1 SAR   EPSG:4326  (deg)      VV/VH dB
    ESRI LULC        EPSG:4326  (deg)      categorical  (the label)
    Hansen loss      EPSG:4326  (deg)      loss-year

`reproject_match` reprojects + snaps every product onto the AEF grid, so a single
(y, x) index points at the same patch of ground in all of them — the prerequisite
for per-pixel fusion. Continuous SAR uses bilinear; categorical LULC/Hansen use
nearest (never interpolate class codes).
"""
from __future__ import annotations

import json
from pathlib import Path

import rioxarray  # noqa: F401  registers the .rio accessor
from rasterio.enums import Resampling

REPO = Path(__file__).resolve().parents[1]
DATA = REPO / "hackathon-demo" / "hackathon_demo_data"
AOI = "D_Chablis_Vineyard"

AEF_PATH = DATA / "aef_embeddings" / "2021" / f"aef_{AOI}_2021.tif"
SAR_PATH = DATA / "sentinel1_gee" / "2023" / f"sentinel1_{AOI}_2023.tif"
LULC_PATH = DATA / "esri_lulc" / "2025" / f"lulc_{AOI}_2025.tif"
HANSEN_PATH = DATA / "hansen_lossyear" / "hansen_lossyear.tif"
CLASSES_PATH = DATA / "esri_lulc_classes.json"
BOUNDARY_PATH = DATA / "boundary" / f"{AOI}_aoi.geojson"

FOREST_CLASS = 2  # ESRI "Trees"


def load_classes():
    """Return ({code: name}, {code: hex}) for the ESRI LULC scheme."""
    j = json.loads(CLASSES_PATH.read_text())
    names = {int(k): v["name"] for k, v in j["classes"].items()}
    colors = {int(k): v["hex"] for k, v in j["classes"].items()}
    return names, colors


def load_aligned():
    """Co-register every product to the AEF grid. Returns a dict of numpy arrays."""
    aef = rioxarray.open_rasterio(AEF_PATH, masked=True).astype("float32")

    sar = (
        rioxarray.open_rasterio(SAR_PATH, masked=True)
        .rio.reproject_match(aef, resampling=Resampling.bilinear)
        .astype("float32")
    )
    lulc = rioxarray.open_rasterio(LULC_PATH).rio.reproject_match(
        aef, resampling=Resampling.nearest
    )
    hansen = rioxarray.open_rasterio(HANSEN_PATH).rio.reproject_match(
        aef, resampling=Resampling.nearest
    )

    return {
        "aef": aef.values,                        # (64, H, W) float32, nan=nodata
        "vv": sar.values[0],                      # (H, W) dB, nan=nodata
        "vh": sar.values[1],                      # (H, W) dB
        "lulc": lulc.values[0].astype("uint8"),   # (H, W) class code, 0=nodata
        "hansen": hansen.values[0].astype("uint8"),  # (H, W) loss year, 0=no loss
        "crs": str(aef.rio.crs),
        "shape": tuple(aef.shape[1:]),            # (H, W)
    }
