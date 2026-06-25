# Through the Clouds Build Contract

## 1. Scope lock

Detect 2022-2023 forest clearing in cloudy Central Kalimantan from local ALOS-2 PALSAR-2 L-band HV annual mosaics, then expose likely plantation-frontier alerts on a web map. Treat the result as a defensible hackathon alert layer, not a regulatory forest-loss product.

- AOI: use bbox `[113.25, -1.25, 113.75, -0.75]` EPSG:4326, centered on the downloaded Drive hotspot `data/drive_raw/boundary-files/G_sar_borneo_aoi.geojson` (`113.4292,-1.0733,113.5708,-0.9267`). Justify it as Central Kalimantan active clearing plus persistent cloud, matching the Drive note.
- Years compared: use 2022 versus 2023 because the demo artefact requires PALSAR HV 2022, PALSAR HV 2023, and 2023 alerts.
- Out of scope: build no near-real-time alerts; train no ML model; classify no definitive oil-palm species map; run no Google Earth Engine in the critical path; download no full 6 GB AEF stack during the demo.

## 2. Pipeline

1. Create folders: input `repo root`; operation `mkdir -p data/raw data/aoi outputs/intermediate outputs/alerts outputs/maps src notebooks`; output folders as listed.

2. Register AOI: input `data/drive_raw/boundary-files/G_sar_borneo_aoi.geojson`; operation reproject to EPSG:4326, buffer bbox to `[113.25,-1.25,113.75,-0.75]`, save both; output `data/aoi/g_sar_borneo_hotspot.geojson` and `data/aoi/g_sar_borneo_bbox.geojson`.

3. Crop SAR: inputs `/sar-data/annual 2/2022/palsar_G_sar_borneo_2022.tif` and `/sar-data/annual 2/2023/palsar_G_sar_borneo_2023.tif`; operation window crop to AOI bbox with `rasterio.mask.mask(crop=True, all_touched=False)`; outputs `outputs/intermediate/palsar_hv_2022_dn.tif` and `outputs/intermediate/palsar_hv_2023_dn.tif`.

4. Calibrate DN to gamma0 dB: inputs cropped DN TIFFs; operation set DN `0` to nodata and compute `gamma0_dB = 10 * log10(DN**2) - 83.0`; cite JAXA PALSAR/PALSAR-2 Mosaic Ver.2.6.0 and Shimada et al. 2014; outputs `outputs/intermediate/hv_2022_db.tif`, `outputs/intermediate/hv_2023_db.tif`.

5. Check co-registration: inputs `hv_2022_db.tif`, `hv_2023_db.tif`; operation assert same CRS, width, height, transform, resolution; if mismatch, reproject 2023 onto 2022 grid with bilinear resampling; output `outputs/intermediate/hv_2023_db_coreg.tif` and `outputs/intermediate/coreg_report.json`.

6. Filter speckle: inputs calibrated 2022 and 2023 dB rasters; operation convert to linear power, apply Quegan-Yu multitemporal filter with a 5 x 5 boxcar expected-value window, then apply Lee 7 x 7 spatial filter; cite Quegan and Yu 2001, Lee 1981, and Doblas et al. 2022. Use only 2022 and 2023 if adjacent years are unavailable. Outputs `outputs/intermediate/hv_2022_filt_db.tif`, `outputs/intermediate/hv_2023_filt_db.tif`.

7. Build masks: input filtered 2022 HV; operation create `water = hv_2022_filt_db <= -24.0 dB` tuned empirically, create `existing_nonforest = hv_2022_filt_db < -14.0 dB` tuned empirically from JAXA/Shimada HV-threshold FNF method, create `slope = false` for every pixel because the AOI is flat lowland peat and JAXA mosaics are already ortho and radiometric-slope corrected; outputs `outputs/intermediate/mask_water.tif`, `mask_nonforest_2022.tif`, `mask_slope.tif`.

8. Detect HV loss: inputs filtered 2022/2023 and masks; operation compute `delta_hv = hv_2023_filt_db - hv_2022_filt_db`; alert pixel where `delta_hv <= -2.0 dB`, `water == false`, `existing_nonforest == false`, and `slope == false`; cite Doblas et al. 2022 CFAR example threshold `1.31 + 2 * 0.35 = 2.01 dB` and tune start at `-2.0 dB`; output `outputs/intermediate/hv_loss_raw.tif`.

9. Clean alerts: input raw mask; operation binary opening `3 x 3`, binary closing `3 x 3`, connected components with 8-neighbor connectivity, keep components `>= 0.2 ha` (32 pixels at 25 m) citing Reiche et al. 2021; output `outputs/alerts/alerts_2023_mask.tif`.

10. Polygonize alerts: input alert mask and delta raster; operation polygonize, dissolve connected polygons, compute `area_ha`, `mean_delta_hv_db`, `min_delta_hv_db`, `baseline_hv_db`, and `candidate_plantation_frontier = area_ha >= 1.0 and mean_delta_hv_db <= -3.0`; outputs `outputs/alerts/alerts_2023.geojson` and `outputs/alerts/alerts_2023.gpkg`.

11. Record Drive auxiliaries: input gdown enumeration; operation list Borneo AEF annual rasters but do not load by default: 2022 `1tSxxxGkAqbzApO6ZDHAg7xdOO6eKq2WI`, 2023 `1CdGkX4c10nnDxbN-0yvAVSpxpNGaVHkZ`; output `outputs/intermediate/drive_assets_used.json`.

## 3. Validation plan

- Sample 50 alert points and 50 stable-forest points using stratified random sampling.
- Cross-check against Hansen GFC `lossyear == 23` and `treecover2000 >= 30`; cite Hansen et al. 2013.
- Cross-check against RADD 2023 alerts inside the AOI if available locally or by appendix EE fallback.
- Cross-check visually against `/sar-data/G-sar/SPOT-HighRes-imagery/spot7_pms_2022-04-23.tiff`; label each sample `loss`, `stable`, or `uncertain`.
- Compute producer's accuracy, user's accuracy, and F1 from the non-uncertain samples.
- Pass the demo only if user's accuracy `>= 0.75`, producer's accuracy `>= 0.65`, F1 `>= 0.70`, and total alert area is between `0.2%` and `8%` of AOI area. Mark these thresholds tuned empirically.

## 4. Demo artefact

- Build one Folium web map at `outputs/maps/through_the_clouds.html`.
- Add exactly three default layers: PALSAR HV 2022, PALSAR HV 2023, and alert polygons.
- Pre-zoom to `Central Kalimantan SAR-through-clouds hotspot` at `[-1.0, 113.5]`, zoom `12`.
- Style alerts red with `fillOpacity=0.35`; show `area_ha`, `mean_delta_hv_db`, and `candidate_plantation_frontier` in the popup.
- Optional stretch: add `outputs/maps/monthly_alert_area.png` only if Sentinel-1 sub-annual alerts are added.

## 5. Tech stack lock

Use Python 3.11. Pin `rasterio==1.3.10`, `rioxarray==0.15.5`, `numpy==1.26.4`, `geopandas==0.14.4`, `folium==0.16.0`, `scipy==1.13.1`, `shapely==2.0.4`, `pyproj==3.6.1`. Use no ML frameworks.

Create files: `src/config.py` constants and paths; `src/calibrate.py` DN to dB; `src/speckle.py` filters; `src/detect_change.py` masks and alerts; `src/polygonize.py` polygons; `src/validate.py` metrics; `src/make_map.py` Folium map; `notebooks/01_sanity_plot.ipynb` visual QA; `outputs/README.md` run notes.

## 6. Hour-by-hour plan

- H0:00-0:45: install dependencies, crop AOI, calibrate 2022/2023, plot one PNG. Exit when `outputs/intermediate/hv_2022_db.tif` opens and values sit roughly `-30` to `0 dB`.
- H0:45-2:00: run co-registration, filtering, delta, raw threshold. Exit when `hv_loss_raw.tif` exists.
- H2:00-3:00: apply masks, MMU, polygonization. Exit when `alerts_2023.geojson` contains `area_ha`.
- H3:00-4:00: validate 100 samples against Hansen/RADD/SPOT. Exit when `outputs/alerts/validation_metrics.json` has PA, UA, F1.
- H4:00-4:45: build Folium map. Exit when HTML opens locally and layers toggle.
- H4:45-5:00: write `outputs/README.md`, save screenshot `outputs/maps/demo_screenshot.png`.

## 7. Failure modes and pre-decided fallbacks

- Calibration looks wrong: print DN min/max; if most calibrated pixels are outside `-35` to `5 dB`, stop and verify the input is raw DN, not already dB.
- Mosaics are not co-registered: warp 2023 to the 2022 grid and continue.
- Threshold gives too many alerts: change HV loss threshold to `-3.0 dB`, rerun once, and record tuned value.
- Threshold gives too few alerts: change HV loss threshold to `-1.5 dB`, rerun once, and record tuned value.
- Water false positives dominate: tighten water mask to `hv_2022 <= -22.0 dB` plus `hv_2023 <= -22.0 dB`.
- Oil palm is indistinguishable from regrowth: keep `candidate_plantation_frontier` as a proxy flag and do not claim oil-palm classification.

## 8. Appendix

- Cite Shimada et al. 2014, RSE, DOI `https://doi.org/10.1016/j.rse.2014.04.014`.
- Cite Motohka et al. 2014, RSE, DOI `https://doi.org/10.1016/j.rse.2014.04.012`.
- Cite Reiche et al. 2016, Nature Climate Change, DOI `https://doi.org/10.1038/nclimate2919`.
- Cite Reiche et al. 2021, ERL, DOI `https://doi.org/10.1088/1748-9326/abd0a8`.
- Cite Doblas et al. 2022, Remote Sensing, DOI `https://doi.org/10.3390/rs14153658`.
- Cite Descals et al. 2021, ESSD oil palm map, DOI `https://doi.org/10.5194/essd-13-1211-2021`.
- Cite Gaveau et al. 2016, Scientific Reports Borneo plantations, DOI `https://doi.org/10.1038/srep32017`.
- Cite Hansen et al. 2013, Science, DOI `https://doi.org/10.1126/science.1244693`.
- Use EE fallback IDs only outside the critical path: `JAXA/ALOS/PALSAR/YEARLY/SAR`, `JAXA/ALOS/PALSAR/YEARLY/FNF`, `UMD/hansen/global_forest_change_2023_v1_11`, `COPERNICUS/S1_GRD`, `projects/radar-wur/raddalert/v1`, `JRC/GSW1_4/GlobalSurfaceWater`, `NASA/NASADEM_HGT/001`.
- Remember PALSAR gotchas: DN is linear amplitude, not dB; DN `0` is nodata; use calibration factor `-83.0`; annual mosaics are already ortho and slope corrected; versioned mosaics can shift by pixels; acquisition dates vary within each annual mosaic; HV-only data cannot prove oil palm.
