# Hackathon demo data pack

A tiny, self-contained sample of the June 2026 hackathon data products, clipped and decimated so the example notebooks run with zero data-access setup: no S3, no AWS credentials, no Google Earth Engine. Unzip this folder next to the notebooks in `example-scripts/`, run `uv sync`, and every notebook reads straight from these local relative paths.

This is a small clipped subset intended for setup and testing, not for full analysis.
Each product has been cropped to a small window and/or decimated. The whole pack is roughly 28 MB on disk.

## Important: Sentinel-2 is a different AOI

Sentinel-2 here comes from **A_koranga_forks_nz (New Zealand)**. Every other product
comes from **D_Chablis_Vineyard (France)**.
Koranga is in the southern hemisphere, so its NDVI seasonal cycle is phase-shifted relative to Europe. That is expected, not a bug. Do not try to co-register the Sentinel-2 cube with the Chablis products; they cover different parts of the world.

## Contents

| Path | Format | AOI | Details |
|---|---|---|---|
| `sentinel2/cube.zarr` | Zarr | A_koranga_forks_nz (NZ) | Monthly-median bands B02-B12 (uint16, reflectance scale 1/10000) plus `n_obs`. 200x200 px window, 24 monthly steps over 2021-2022, 10 m. See caveats below. |
| `sentinel1_gee/2023/sentinel1_D_Chablis_Vineyard_2023.tif` | COG | D_Chablis_Vineyard (FR) | Annual VV/VH backscatter in dB (band 1 = VV, band 2 = VH), float32, ~10 m, decimated to ~700 px. |
| `esri_lulc/2025/lulc_D_Chablis_Vineyard_2025.tif` | COG | D_Chablis_Vineyard (FR) | Categorical land cover, uint8, 10 m, EPSG:4326. `0` = nodata. Palette in `esri_lulc_classes.json`. |
| `hansen_lossyear/hansen_lossyear.tif` | COG | D_Chablis_Vineyard (FR) | Forest-loss year, uint8. `0` = no loss; `1`-`24` map to year `2000+n`. ~30 m. |
| `aef_embeddings/2021/aef_D_Chablis_Vineyard_2021.tif` | COG | D_Chablis_Vineyard (FR) | 64-band float32 embeddings, native UTM (EPSG:32631), decimated to ~200 px. |
| `ecostress/cube.zarr` | Zarr | D_Chablis_Vineyard (FR) | Land-surface temperature `LST` (Kelvin) plus `cloud`. 70 m, EPSG:2154. See caveats below. |
| `boundary/D_Chablis_Vineyard_aoi.geojson` | GeoJSON | D_Chablis_Vineyard (FR) | Chablis AOI outline. |
| `esri_lulc_classes.json` | JSON | - | LULC code to name plus hex palette. |

## Caveats

These are the gotchas the notebooks already handle for you. Read them before doing
anything beyond the examples.

### Sentinel-2: not baseline-harmonised
The optical bands are **not** baseline-harmonised. There is an artificial **+1000 DN step
at 2022-01-25** (ESA Processing Baseline 04.00, `BOA_ADD_OFFSET = -1000`). Any analysis
crossing that date (NDVI, change detection, model training) will be wrong unless you
harmonise first: subtract 1000 (clamp at 0) from the optical bands of scenes on or after
2022-01-25. Notebook `01_sentinel2_optical.ipynb` shows the step and the fix.

### Sentinel-2: n_obs and nodata
`n_obs == 0` means there was no clear observation that month; treat those pixels as
nodata. To recover physical reflectance, divide the band values by 10000.

### Sentinel-1: dB, not linear
The GEE annual GeoTIFF is in dB. Notebook `03_sentinel1_sar_despeckle.ipynb` converts
dB to linear power before filtering (speckle filters assume linear), then converts back
to dB for display.

### ESRI LULC: nodata is 0
Code `0` means no data or outside the AOI. Mask it out before computing class areas.

### ECOSTRESS: sparse by design
All timesteps are kept, including all-NaN ones. ECOSTRESS revisits are irregular, so only
about 192 of 638 timesteps carry valid pixels. Drop the empty timesteps at read time; do
not fill the NaNs.

## Opening a cube or COG

Everything reads from local relative paths. From `example-scripts/` (the folder that
holds the notebooks and this `hackathon_demo_data/` directory):

```python
import xarray as xr
import rioxarray

# Zarr cube (Sentinel-2)
s2 = xr.open_zarr("hackathon_demo_data/sentinel2/cube.zarr")
red = s2["B04"] / 10000.0            # uint16 DN to reflectance

# Zarr cube (ECOSTRESS) — drop all-NaN timesteps
eco = xr.open_zarr("hackathon_demo_data/ecostress/cube.zarr")
lst = eco["LST"].dropna("time", how="all")   # Kelvin

# COG (single- or multi-band GeoTIFF)
s1 = rioxarray.open_rasterio(
    "hackathon_demo_data/sentinel1_gee/2023/sentinel1_D_Chablis_Vineyard_2023.tif"
)   # band 1 = VV (dB), band 2 = VH (dB)
```
