# Through the Clouds — Build Contract (Orchestration Review)

## 0. Reviewer's brief

This document is no longer a single-agent instruction sheet. It is a review artefact for humans to decide:

1. Whether this build should run as one linear agent or be split across multiple specialised agents.
2. Where the natural agent boundaries fall, and what each boundary's handoff contract is.
3. Which steps need judgement (LLM agent or human) versus deterministic execution.
4. Where validation gates and human-in-the-loop checkpoints belong.
5. Where parallelism is safe and where it is not.

Every numeric value, file path, threshold, Drive ID, DOI, and Earth Engine collection ID from the prior version is preserved. New material is annotation, not replacement.

## 1. Scope lock

Detect 2022–2023 forest clearing in cloudy Central Kalimantan from local ALOS-2 PALSAR-2 L-band HV annual mosaics, then expose likely plantation-frontier alerts on a web map. Treat the result as a defensible hackathon alert layer, not a regulatory forest-loss product.

- **AOI:** bbox `[113.25, -1.25, 113.75, -0.75]` EPSG:4326, centered on the downloaded Drive hotspot `data/drive_raw/boundary-files/G_sar_borneo_aoi.geojson` (`113.4292, -1.0733, 113.5708, -0.9267`). Central Kalimantan active clearing plus persistent cloud, matching the Drive note.
- **Years compared:** 2022 vs 2023. The demo artefact requires PALSAR HV 2022, PALSAR HV 2023, and 2023 alerts.
- **Out of scope:** no near-real-time alerts, no ML training, no definitive oil-palm species classification, no Google Earth Engine in the critical path, no full 6 GB AEF stack download during the demo.

## 2. Agent decomposition (proposed)

Six candidate agents. Reviewer chooses how many to instantiate.

| ID | Agent | Owns pipeline steps | Judgement needed | Parallelisable with | Est. wall time |
|----|-------|---------------------|------------------|---------------------|----------------|
| A | Data Prep | §3.1–§3.3 | Low — verify AOI bbox is sensible | None (upstream of all) | 15 min |
| B | Calibrate & Filter | §3.4–§3.6 | Low — only if calibration sanity check fails | None (strict B→C dependency) | 30 min |
| C | Change Detection | §3.7–§3.10 | Medium — threshold tuning may iterate | E (map prep can stub) | 60 min |
| D | Validation | §5 | High — sample labelling, accept/reject demo | E (map can build while D samples) | 60 min |
| E | Demo / Map | §6 | Low — visual polish | D | 45 min |
| F | Orchestrator | crosscut: gates, retries, threshold loops | High — owns the C↔D tuning loop | n/a | continuous |

**Dependency DAG (text):**

```
A ──► B ──► C ──► D ──► (accept?) ──► E ──► done
                  └──────────────────► E (stub map, refine after D)
F supervises all transitions, owns §10 fallbacks.
```

**Parallelism notes:**
- A, B, C are strictly serial — each consumes the previous step's raster.
- D and E can overlap once C emits a first-pass alert polygon set.
- F is the only agent allowed to mutate thresholds in `src/config.py`.

**Single-agent fallback:** if the orchestration cost outweighs the 5-hour budget, collapse A–E into one Codex-style agent following §3 in order. F still exists as a human reviewer at the C→D gate.

## 3. Pipeline (annotated for orchestration)

Each step lists: **Owner** · **In** · **Op** · **Out** · **Idempotent?** · **Gate** (what proves it succeeded).

### 3.1 Folder scaffold
- Owner: A · Idempotent: yes
- In: repo root
- Op: `mkdir -p data/raw data/aoi outputs/intermediate outputs/alerts outputs/maps src notebooks`
- Out: directories above
- Gate: `ls outputs/intermediate` returns the empty dir.

### 3.2 Register AOI
- Owner: A · Idempotent: yes
- In: `data/drive_raw/boundary-files/G_sar_borneo_aoi.geojson`
- Op: reproject to EPSG:4326; emit both the hotspot polygon and the buffered analysis bbox `[113.25, -1.25, 113.75, -0.75]`.
- Out: `data/aoi/g_sar_borneo_hotspot.geojson`, `data/aoi/g_sar_borneo_bbox.geojson`
- Gate: both files open in QGIS / `geopandas.read_file`; CRS == EPSG:4326.

### 3.3 Crop SAR mosaics
- Owner: A · Idempotent: yes
- In: `/sar-data/annual 2/2022/palsar_G_sar_borneo_2022.tif`, `/sar-data/annual 2/2023/palsar_G_sar_borneo_2023.tif`
- Op: `rasterio.mask.mask(crop=True, all_touched=False)` to AOI bbox.
- Out: `outputs/intermediate/palsar_hv_2022_dn.tif`, `outputs/intermediate/palsar_hv_2023_dn.tif`
- Gate: both rasters share identical width, height, transform.
- Handoff to B: see §4.1.

### 3.4 Calibrate DN → gamma0 dB
- Owner: B · Idempotent: yes · Judgement: no
- In: cropped DN TIFFs from §3.3
- Op: set DN `0` → nodata; compute `gamma0_dB = 10 * log10(DN**2) - 83.0`. Cite JAXA PALSAR/PALSAR-2 Mosaic Ver. 2.6.0 and Shimada et al. 2014.
- Out: `outputs/intermediate/hv_2022_db.tif`, `outputs/intermediate/hv_2023_db.tif`
- Gate: pixel histogram lies inside `[-35, 5] dB`. Outside → trigger §10 calibration fallback.

### 3.5 Check co-registration
- Owner: B · Idempotent: yes
- In: `hv_2022_db.tif`, `hv_2023_db.tif`
- Op: assert same CRS, width, height, transform, resolution. On mismatch, reproject 2023 onto 2022 grid with bilinear resampling.
- Out: `outputs/intermediate/hv_2023_db_coreg.tif` (only if reprojected), `outputs/intermediate/coreg_report.json`
- Gate: `coreg_report.json` field `aligned == true`.

### 3.6 Speckle filter
- Owner: B · Idempotent: yes
- In: calibrated 2022 and 2023 dB rasters
- Op: convert to linear power; apply Quegan–Yu multitemporal filter (5×5 boxcar expected-value window); apply Lee 7×7 spatial filter. Cite Quegan & Yu 2001, Lee 1981, Doblas et al. 2022. Use only 2022 and 2023 if adjacent years unavailable.
- Out: `outputs/intermediate/hv_2022_filt_db.tif`, `outputs/intermediate/hv_2023_filt_db.tif`
- Gate: standard deviation in a 100×100 forest patch drops ≥ 30 % vs. unfiltered.
- Handoff to C: see §4.2.

### 3.7 Build masks
- Owner: C · Idempotent: yes
- In: filtered 2022 HV
- Op:
  - `water = hv_2022_filt_db <= -24.0 dB` (tuned empirically)
  - `existing_nonforest = hv_2022_filt_db < -14.0 dB` (Shimada/JAXA FNF HV-threshold method, tuned empirically)
  - `slope = false` for every pixel — AOI is flat lowland peat; JAXA mosaics are already ortho- and radiometric-slope-corrected.
- Out: `outputs/intermediate/mask_water.tif`, `mask_nonforest_2022.tif`, `mask_slope.tif`
- Gate: water mask covers < 15 % of AOI (sanity check against AOI being mostly land).

### 3.8 Detect HV loss
- Owner: C · Idempotent: yes · Judgement: medium (may iterate threshold)
- In: filtered 2022/2023 rasters, masks from §3.7
- Op: `delta_hv = hv_2023_filt_db - hv_2022_filt_db`; alert pixel where `delta_hv <= -2.0 dB` AND `water == false` AND `existing_nonforest == false` AND `slope == false`. Cite Doblas et al. 2022 CFAR example `1.31 + 2 × 0.35 = 2.01 dB`; start tuning at `-2.0 dB`.
- Out: `outputs/intermediate/hv_loss_raw.tif`
- Gate: raw alert area between 0.1 % and 15 % of AOI. Outside → §10 threshold fallback (loop back through F).

### 3.9 Clean alerts
- Owner: C · Idempotent: yes
- In: raw alert mask
- Op: binary opening 3×3, binary closing 3×3, connected components with 8-neighbour connectivity, drop components `< 0.2 ha` (32 pixels at 25 m). Cite Reiche et al. 2021.
- Out: `outputs/alerts/alerts_2023_mask.tif`
- Gate: ≥ 50 connected components survive (otherwise threshold likely too tight).

### 3.10 Polygonize alerts
- Owner: C · Idempotent: yes
- In: alert mask + delta raster
- Op: polygonize, dissolve connected polygons, compute attributes:
  - `area_ha`
  - `mean_delta_hv_db`
  - `min_delta_hv_db`
  - `baseline_hv_db`
  - `candidate_plantation_frontier = (area_ha >= 1.0) AND (mean_delta_hv_db <= -3.0)`
- Out: `outputs/alerts/alerts_2023.geojson`, `outputs/alerts/alerts_2023.gpkg`
- Gate: `alerts_2023.geojson` opens; every feature has all five attributes; CRS == EPSG:4326.
- Handoff to D and E: see §4.3.

### 3.11 Record Drive auxiliaries (manifest only)
- Owner: A or F · Idempotent: yes
- In: `gdown` enumeration
- Op: list Borneo AEF annual rasters but do **not** load by default. Record IDs:
  - 2022: `1tSxxxGkAqbzApO6ZDHAg7xdOO6eKq2WI`
  - 2023: `1CdGkX4c10nnDxbN-0yvAVSpxpNGaVHkZ`
- Out: `outputs/intermediate/drive_assets_used.json`
- Gate: JSON contains the two IDs with `loaded: false`.

## 4. Handoff contracts

Define the artefact schema between agents so any agent can be re-run in isolation.

### 4.1 A → B
- **Files:** `outputs/intermediate/palsar_hv_{2022,2023}_dn.tif`
- **Type:** GeoTIFF, single band, uint16 DN, EPSG:4326, identical grid.
- **Pre-conditions for B to start:** both files exist; shapes equal; nodata = 0.

### 4.2 B → C
- **Files:** `outputs/intermediate/hv_{2022,2023}_filt_db.tif`, `outputs/intermediate/coreg_report.json`
- **Type:** float32 dB rasters with no NaN runs > 5 % per row; `coreg_report.aligned == true`.
- **Pre-conditions for C:** value range in `[-35, 5] dB`; speckle-filter sigma reduction logged.

### 4.3 C → {D, E}
- **Files:** `outputs/alerts/alerts_2023.geojson`, `outputs/alerts/alerts_2023.gpkg`, `outputs/alerts/alerts_2023_mask.tif`
- **Schema:** GeoJSON FeatureCollection; per-feature properties exactly `area_ha:float`, `mean_delta_hv_db:float`, `min_delta_hv_db:float`, `baseline_hv_db:float`, `candidate_plantation_frontier:bool`.
- **Pre-conditions for D:** feature count ≥ 20 (need samples to validate). For E: file opens in `folium.GeoJson`.

### 4.4 D → F (gate)
- **File:** `outputs/alerts/validation_metrics.json`
- **Schema:** `{ producers_accuracy, users_accuracy, f1, alert_area_pct_of_aoi, sample_size }`.
- **Pre-conditions to pass:** UA ≥ 0.75, PA ≥ 0.65, F1 ≥ 0.70, alert area in `[0.2 %, 8 %]`.
- **On fail:** F triggers §10 threshold loop (max 2 iterations) before escalating to human.

### 4.5 E → done
- **File:** `outputs/maps/through_the_clouds.html`
- **Pre-conditions:** opens locally; three layers toggle; pre-zoom matches §6.

## 5. Validation plan

- Stratified random sample: 50 alert points + 50 stable-forest points.
- Cross-checks:
  - Hansen GFC `lossyear == 23 AND treecover2000 >= 30` (Hansen et al. 2013).
  - RADD 2023 alerts inside AOI if available locally; otherwise note as EE fallback (see appendix).
  - Visual against `/sar-data/G-sar/SPOT-HighRes-imagery/spot7_pms_2022-04-23.tiff`; label each sample `loss`, `stable`, or `uncertain`.
- Metrics from non-uncertain samples: producer's accuracy, user's accuracy, F1.
- **Demo passes iff:** UA ≥ 0.75 AND PA ≥ 0.65 AND F1 ≥ 0.70 AND total alert area ∈ `[0.2 %, 8 %]` of AOI. All thresholds tuned empirically.

## 6. Demo artefact

- Folium web map at `outputs/maps/through_the_clouds.html`.
- Exactly three default layers: PALSAR HV 2022, PALSAR HV 2023, alert polygons.
- Pre-zoom: `Central Kalimantan SAR-through-clouds hotspot`, centre `[-1.0, 113.5]`, zoom `12`.
- Alerts styled red, `fillOpacity = 0.35`; popup shows `area_ha`, `mean_delta_hv_db`, `candidate_plantation_frontier`.
- Optional stretch (only if Sentinel-1 sub-annual added): `outputs/maps/monthly_alert_area.png`.

## 7. Tech stack lock

Python 3.11. Pinned:

```
rasterio==1.3.10
rioxarray==0.15.5
numpy==1.26.4
geopandas==0.14.4
folium==0.16.0
scipy==1.13.1
shapely==2.0.4
pyproj==3.6.1
```

No ML frameworks.

**File layout** (every file an agent creates):

| Path | Owner | Purpose |
|------|-------|---------|
| `src/config.py` | F | Constants, paths, thresholds (single source of tunable truth) |
| `src/calibrate.py` | B | DN → dB |
| `src/speckle.py` | B | Quegan–Yu + Lee filters |
| `src/detect_change.py` | C | Masks + alert raster |
| `src/polygonize.py` | C | Polygons + attributes |
| `src/validate.py` | D | Sampling + metrics |
| `src/make_map.py` | E | Folium map |
| `notebooks/01_sanity_plot.ipynb` | A/B | Visual QA after calibrate |
| `outputs/README.md` | F | Run notes, threshold tuning log |

## 8. Decision points for human reviewers

Before kicking off orchestration, decide:

1. **Agent count.** Six-agent split as in §2, or collapse to one? Five-hour budget may not amortise inter-agent overhead.
2. **Threshold ownership.** Should F's tuning loop be automated (re-run C with new threshold up to N times) or always escalate to human after first miss?
3. **Validation labelling.** Is D allowed to label `uncertain` samples autonomously from SPOT, or must a human eyeball the 100 samples?
4. **Idempotency policy.** Are agents allowed to overwrite previous outputs, or must each run write to a timestamped subfolder?
5. **Drive auxiliaries.** Confirm §3.11 stays manifest-only. Loading the AEF stack changes the runtime budget by ≥ 60 min.
6. **Single-shot demo vs. tunable.** If validation fails, do we ship the failing map with caveats or block on §10 fallbacks?
7. **Memory of the run.** Should F persist a structured `run_log.jsonl` for downstream review? Currently only `outputs/README.md` and `coreg_report.json` are mandated.

## 9. Hour-by-hour timeline (with agent ownership)

| Time | Agent(s) | Work | Exit criterion |
|------|----------|------|----------------|
| H0:00–0:45 | A, B | install deps, crop AOI, calibrate 2022/2023, plot one PNG | `hv_2022_db.tif` opens; values ≈ `-30..0 dB` |
| H0:45–2:00 | B, C | co-registration, filter, delta, raw threshold | `hv_loss_raw.tif` exists |
| H2:00–3:00 | C | masks, MMU, polygonize | `alerts_2023.geojson` has `area_ha` |
| H3:00–4:00 | D | 100 samples vs. Hansen/RADD/SPOT | `validation_metrics.json` has PA, UA, F1 |
| H4:00–4:45 | E | Folium map | HTML opens locally; layers toggle |
| H4:45–5:00 | F | `outputs/README.md`, `outputs/maps/demo_screenshot.png` | both committed |

## 10. Failure modes and pre-decided fallbacks (with escalation owner)

| Failure | Detector | Fallback action | Owner |
|---------|----------|-----------------|-------|
| Calibration looks wrong (most pixels outside `-35..5 dB`) | B at §3.4 gate | Print DN min/max; verify input is raw DN not already dB; stop. | B → human |
| Mosaics not co-registered | B at §3.5 | Warp 2023 to 2022 grid (bilinear); continue. | B |
| Too many alerts (> 15 % AOI raw) | C at §3.8 gate | Set HV loss threshold = `-3.0 dB`; rerun §3.8–§3.10 once; log tuned value. | F |
| Too few alerts (< 0.1 % AOI raw) | C at §3.8 gate | Set HV loss threshold = `-1.5 dB`; rerun once; log tuned value. | F |
| Water false positives dominate | D at §5 inspection | Tighten water mask to `hv_2022 <= -22.0 dB AND hv_2023 <= -22.0 dB`. | F |
| Oil palm indistinguishable from regrowth | D | Keep `candidate_plantation_frontier` as proxy only; do not claim oil-palm classification. | D |

## 11. Appendix

### Citations
- Shimada et al. 2014, RSE — https://doi.org/10.1016/j.rse.2014.04.014
- Motohka et al. 2014, RSE — https://doi.org/10.1016/j.rse.2014.04.012
- Reiche et al. 2016, Nature Climate Change — https://doi.org/10.1038/nclimate2919
- Reiche et al. 2021, ERL — https://doi.org/10.1088/1748-9326/abd0a8
- Doblas et al. 2022, Remote Sensing — https://doi.org/10.3390/rs14153658
- Descals et al. 2021, ESSD oil palm map — https://doi.org/10.5194/essd-13-1211-2021
- Gaveau et al. 2016, Scientific Reports — https://doi.org/10.1038/srep32017
- Hansen et al. 2013, Science — https://doi.org/10.1126/science.1244693

### Earth Engine fallback IDs (outside critical path)
- `JAXA/ALOS/PALSAR/YEARLY/SAR`
- `JAXA/ALOS/PALSAR/YEARLY/FNF`
- `UMD/hansen/global_forest_change_2023_v1_11`
- `COPERNICUS/S1_GRD`
- `projects/radar-wur/raddalert/v1`
- `JRC/GSW1_4/GlobalSurfaceWater`
- `NASA/NASADEM_HGT/001`

### Drive auxiliary references (manifest only)
- Borneo AEF annual 2022: `1tSxxxGkAqbzApO6ZDHAg7xdOO6eKq2WI`
- Borneo AEF annual 2023: `1CdGkX4c10nnDxbN-0yvAVSpxpNGaVHkZ`
- AOI source file: `data/drive_raw/boundary-files/G_sar_borneo_aoi.geojson`
- AEF embedding spec: `data/drive_raw/README.md` (64-band float32 GeoTIFF, ~10 m, AOIs 2017–2025)

### PALSAR gotchas
- DN is linear amplitude, not dB.
- DN `0` is nodata.
- Calibration factor: `-83.0`.
- Annual mosaics are already ortho- and slope-corrected.
- Versioned mosaics can shift by pixels — always re-check co-registration.
- Acquisition dates vary within each annual mosaic.
- HV-only data cannot prove oil palm — use the `candidate_plantation_frontier` flag, never assert.
