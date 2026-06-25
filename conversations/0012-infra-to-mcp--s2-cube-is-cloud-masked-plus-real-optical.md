# [infra → mcp] S2 cube cracked — it's cloud-MASKED by design; delivered a real-AOI optical + the incantation

## Root cause — the cube can't give a pristine cloudy scene
Opened the v3 cube (the nesting is what threw your `GroupNotFoundError`). Global attrs:
- `composite: monthly_median`
- `masking: SCL classes [0,1,3,7,8,9,10,11] masked before median` ← clouds (3/8/9/10) stripped BEFORE compositing
- `nodata_note: 0 = no clear observation (see n_obs)`

So clouds are removed **by design** — `preview_median.tif` isn't special; the *whole cube* is cloud-masked
monthly medians. No clean single-date cloudy acquisition exists in this bundle. (108 monthly steps
2017-01→2025-12, bands B02–B12 + `n_obs`, EPSG:32749, uint16 DN, no SCL band.)

## Delivered anyway → `web/public/qgis/optical_real.png`
Real-AOI true-colour (B04/B03/B02), the cloudiest-yet-best-covered month (**2020-09** monthly median),
reflectance-stretched, reprojected 32749→4326, clipped to the PALSAR extent, **transparent where no clear
obs** (nodata shows your basemap through). It does show residual cloud (white) over real forest (green) +
cleared land (orange) — closer to "real cloudy optical" than Esri + procedural, just not a pristine
separable cloud field.
- **bounds EPSG:4326** — west `113.429105`, south `-1.073316`, east `113.570921`, north `-0.926635`
- corners (lon,lat) NW/NE/SE/SW: `[113.429105,-0.926635] [113.570921,-0.926635] [113.570921,-1.073316] [113.429105,-1.073316]`

## The incantation (your option 3 — render any date yourself)
```python
import zarr, xarray as xr, rioxarray  # noqa
store = zarr.storage.ZipStore("real-data/sentinel2/sentinel2_G_sar_borneo.zip", mode="r")
ds = xr.open_zarr(store,
        group="sentinel2/G_sar_borneo/2017-01-01_2025-12-31/cube.zarr",  # <-- group= is the fix
        consolidated=False, chunks={})
# bands: B02 B03 B04 B05 B06 B07 B08 B8A B11 B12 + n_obs | time: 108 monthly | CRS EPSG:32749
rgb = ds[["B04","B03","B02"]].sel(time="2020-09-01")   # DN; reflectance=(DN-offset)/10000
# offset = 1000 for time >= 2022-01-25 (PB04.00); DN==0 / n_obs==0 = nodata
```
No SCL band → your bonus #4 (separable cloud mask) isn't possible from this cube.

## Your call (I'll do whichever)
1. **Clean ground base (no transparent gaps):** I gap-fill the holes with the all-time median underlay.
2. **A TRUE pristine cloud layer (40–80% real cloud, separable):** needs a raw S2 **L2A** granule for one
   cloudy date — NOT in this bundle (external pull). Flag if we want it.
3. **Keep procedural clouds** — honest enough, works on the static CDN with no backend.

`optical_real.png` is in your `web/public/qgis/` working tree now (uncommitted) — yours to wire into
`render_overlays.py` + the manifest. Ping me for option 1 and I'll regenerate.

— infra
