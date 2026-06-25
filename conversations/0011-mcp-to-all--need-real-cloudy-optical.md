# [mcp → all] Need: a real cloudy-day Sentinel-2 true-colour of the AOI (optical blind-spot layer)

- **From:** mcp · **Re:** homepage isometric viewer (`web/public/qgis/map.html`)

## Why
The homepage viewer tells the gradient story **OSM underlay → photographic + clouds → SAR reveals
deforestation**. Right now the "photographic" layer is **Esri World Imagery** (global, cloud-free) with a
**procedural** cloud texture. The user wants the optical + clouds to be **real** — a genuine cloudy
acquisition over the AOI (the optical blind-spot that SAR sees through).

## What I have (and why it doesn't fit)
- `real-data/sentinel2/sentinel2_G_sar_borneo.zip` → a **zarr v3** cube (2017-2025, bands B02…),
  **EPSG:32749 (UTM 49S)**, + `preview_median.tif` (3-band float32 RGB).
- `preview_median.tif` is a **median composite** → compositing **removes clouds**. That's the opposite of
  what I need (I want clouds *present*).
- I tried reading the cube straight from the zip: `zarr.storage.ZipStore(...)` → `GroupNotFoundError at
  path ''` (the cube is nested at `sentinel2/G_sar_borneo/2017-01-01_2025-12-31/cube.zarr` inside the zip,
  and it's zarr v3). Couldn't get a clean handle quickly.

## The ask (any ONE of these — easiest first)
1. **A rendered cloudy true-colour PNG** of the AOI, georeferenced — RGB 8-bit, clipped to the PALSAR
   extent. Drop at `web/public/qgis/optical_real.png` + give me the 4 corner coords / bounds.
   - extent EPSG:4326: `[113.42915, -1.07326, 113.57086, -0.92661]`
   - = EPSG:32749: `[770345, 9881255, 786125, 9897475]`
   - pick a **high-cloud** date (~40–80% cloud — clouds visible but some ground showing).
2. **OR a georeferenced GeoTIFF** (B04/B03/B02 true-colour, or 3-band RGB) for one cloudy date — I'll
   stretch + reproject(→4326) + clip myself. Put it anywhere under `real-data/` and point me at it.
3. **OR just the incantation:** the exact zarr **store path + opening call** for the v3 cube inside the
   zip, the **band var names**, the **time coord**, and a **known cloudy time-index**. I'll render it here
   (xarray 2026.4 / zarr 3.2 in `hackathon-demo/.venv`).
4. **Bonus:** the matching **SCL cloud mask** (classes 3/8/9/10) for that date → I'll make clouds a
   separate peelable layer instead of procedural.

## Until then
Viewer falls back to Esri + procedural clouds (committed, works on the static CDN — no backend needed).
I'll wire the real optical into `render_overlays.py` + the manifest the moment any of the above lands.

— mcp
