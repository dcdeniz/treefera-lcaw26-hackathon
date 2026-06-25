# Treefera Hackathon — Cheat Sheet

Everything we've covered: units, concepts, sensors, data products, ML. Skim the
section you need. **Bold = the number/term to remember.**

---

## 1. Units & "resolution" vocabulary

| Term | What it means | Unit |
|---|---|---|
| **Spatial resolution / pixel spacing** | size of one pixel on the ground | metres (m). Our SAR/optical = **10 m** |
| Pixel **area** | a 10 m pixel covers 10×10 | **100 m²** (NOT "10 m²") |
| **Hectare (ha)** | standard land/forest unit | **10,000 m²** = a 100×100 m square = 100 pixels |
| **Temporal resolution / revisit** | how often the satellite re-images a spot | days (Sentinel-1 now ≈ **6 days**) |
| **Spectral resolution** | how many / how narrow the colour bands | count + nanometres (nm) |
| **Radiometric** | how the pixel value encodes signal strength | dB (radar), reflectance 0–1 (optical) |
| **Biomass** | above-ground plant mass per area (AGB) | **tonnes per hectare (t/ha)**; carbon ≈ 0.47 × biomass |
| **Swath** | width of the strip the satellite images | km (Sentinel-1 IW ≈ 250 km) |

---

## 2. Satellites & sensors (each "technology")

| Sensor | Type | Band / λ | Resolution | Revisit | Measures |
|---|---|---|---|---|---|
| **Sentinel-1** | SAR (radar, active) | C-band, **5.6 cm** | **10 m** | ~6 days | backscatter (structure, roughness, moisture) — *sees through cloud* |
| **Sentinel-2** | Optical (passive) | 13 bands, visible→SWIR | 10/20/60 m | ~5 days | reflectance → NDVI, red-edge, water colour |
| **ECOSTRESS** | Thermal (on ISS) | thermal-IR | **~70 m** | irregular/sparse | land-surface temperature (LST), Kelvin |
| **GEDI** | Lidar (on ISS) | laser | ~25 m footprints | sparse samples | **canopy height** (the height training-label source) |
| **Landsat** | Optical | visible→thermal | 30 m | 16 days | the base for **Hansen** forest-loss maps |
| **NISAR** (2024+) | SAR | **L-band, 24 cm** | ~10 m | ~12 days | deeper canopy / biomass (penetrates to branches) |
| **BIOMASS** (ESA, 2025) | SAR | **P-band, ~70 cm** | ~50 m | — | built to weigh **tropical** forest biomass |
| **AlphaEarth / AEF** | AI embeddings | — (fuses many sensors) | **10 m** | annual | **64-D** learned vector per pixel |

**Active vs passive:** active = brings its own energy (radar, lidar); works day/night,
through cloud. Passive = needs the sun (optical, thermal-IR).

---

## 3. SAR concepts (the hard vocabulary)

- **SAR** — Synthetic Aperture Radar. Fires microwave pulses, measures the echo.
- **Synthetic aperture** — uses the satellite's *motion* + computation to fake a giant
  antenna, getting metre-scale detail a small antenna couldn't.
- **Backscatter (σ⁰, "sigma-nought")** — the pixel value: fraction of the pulse returned
  to the sensor. In **dB** (decibels, a log scale). Driven by **roughness, 3-D structure,
  moisture** — NOT colour.
- **Volume scattering** — pulse ricochets inside a 3-D canopy → forests look **bright**.
  Clear the forest → scattering collapses → backscatter **drops** = deforestation signal.
- **Polarization** — wave orientation. Sentinel-1 gives **VV** (surface) and **VH**
  (cross-pol; volume scattering → the *vegetation* channel). VH typically ~7 dB below VV.
- **Bands:** C (5.6 cm, top of canopy) · L (24 cm, branches/trunk) · P (70 cm, deep) ·
  X (3 cm, surface detail). Longer λ → deeper penetration → higher biomass ceiling.
- **Speckle** — grainy salt-and-pepper from coherent-wave *interference* (not normal
  noise). **Despeckle** by averaging: spatial (**Lee / Refined-Lee** filter, multilooking)
  or **temporal** (stack many passes).
- **GRD vs SLC** — **GRD** = Ground Range Detected = amplitude only (*our data*). **SLC** =
  Single Look Complex = amplitude **+ phase**.
- **InSAR / coherence** — uses *phase* between two passes for elevation/deformation or
  coherence-change. **Needs SLC — impossible with GRD.** (Good Q&A line.)
- **Saturation** — backscatter stops rising with biomass past a ceiling: C ≈ **20–50 t/ha**,
  L ≈ 100–150, P ≈ 200+. Tropical forest = 200–400+ t/ha → **C-band is blind to dense-forest
  biomass** (but still detects the binary loss).
- **Terrain correction / calibration** — fixing geometry (with a DEM) and converting raw
  counts to σ⁰. *Already done* in GEE's analysis-ready `S1_GRD`.

---

## 4. Optical / spectral concepts

- **Reflectance** — fraction of sunlight reflected, 0–1. Sentinel-2 stored as integers
  (DN); **divide by 10000** to get physical reflectance.
- **DN (digital number)** — raw stored integer pixel value.
- **Bands** — B02 blue, B03 green, B04 red, B08 NIR; **red-edge = B05/B06/B07/B8A**
  (705–865 nm) — sensitive to chlorophyll/stress → the *pre-symptomatic* disease signal.
- **NDVI** = (NIR−Red)/(NIR+Red) = (B08−B04)/(B08+B04). Vegetation vigour, −1…1.
- **NDWI** = (Green−NIR)/(Green+NIR) — water. **NDTI** = (Red−Green)/(Red+Green) — turbidity.
- **Baseline harmonisation gotcha** — ESA added a **−1000 offset** from 2022-01-25
  (Processing Baseline 04.00). Subtract 1000 (clamp at 0) on scenes ≥ that date or any
  time-series analysis is wrong.
- **Phenology** — a pixel's seasonal NDVI cycle; its *shape* reveals crop type / practice.

---

## 5. Data products in your bundle

| File | Format | What it is |
|---|---|---|
| `sentinel2/cube.zarr` | **Zarr** | optical time series cube (NZ) |
| `sentinel1_gee/.../*.tif` | **COG** | SAR VV/VH in dB (FR) |
| `aef_embeddings/.../*.tif` | COG | 64-band AlphaEarth (FR), **unit-normalised** |
| `hansen_lossyear.tif` | COG | forest-loss year (0=none, n→year 2000+n) |
| `esri_lulc/.../*.tif` | COG | categorical land cover (0=nodata) |
| `ecostress/cube.zarr` | Zarr | land-surface temp (K), sparse |
| `*_aoi.geojson` | GeoJSON | area-of-interest outline (vector) |

- **Zarr** — chunked array store for big N-D cubes (time×y×x). Read with `xarray`.
- **COG** — Cloud-Optimized GeoTIFF — a raster image. Read with `rioxarray`/`rasterio`.
- **Raster** = grid of pixels (images). **Vector** = points/lines/polygons (boundaries).

---

## 6. Geospatial / GIS concepts

- **CRS** — Coordinate Reference System: how pixels map to Earth.
- **EPSG codes:** **4326** = WGS84 lat/lon (degrees) · **32631** = UTM 31N (metres, France) ·
  **2154** = Lambert-93 (France national, metres).
- **AOI** — Area Of Interest (the patch you analyse).
- **Co-registration** — aligning two rasters onto the same grid so pixels overlap.
- **Resampling** — changing a raster's grid/resolution (e.g. 70 m → 10 m).
- **nodata** — flag value for "no valid pixel" (here often **0**; S2 `n_obs==0`).

---

## 7. Forest / carbon domain

- **Deforestation** = forest → non-forest (binary loss). **Degradation** = thinning without
  full clearance (subtler).
- **AGB (above-ground biomass)** in t/ha → **carbon stock** (≈0.47×) → CO₂.
- **Canopy height** — top-of-trees height; proxy for biomass; measured by **GEDI** lidar.
- **MRV** — Monitoring, Reporting, Verification — the trust layer of carbon markets
  (Treefera's business).
- **Carbon credit** — 1 tonne CO₂ avoided/removed; only valuable if *verified*.
- **EUDR** — EU Deforestation Regulation: importers must prove commodities aren't from
  deforested land → demand for exactly this monitoring.
- **Hansen Global Forest Change** — annual 30 m global forest-loss dataset (our ground truth).
- **RADD alerts** — operational Sentinel-1 deforestation alert system (the prior art to
  position against, not pretend you invented).
- **Trophic cascade** (track C) — removing apex predators ripples down the food chain
  (→ overgrazing → visible vegetation change).

---

## 8. Machine learning (PyTorch session)

- **Tensor** — array that can live on GPU + track gradients. Your data, weights, predictions.
- **Autograd** — PyTorch records ops and `.backward()` auto-computes gradients (backprop).
- **`nn.Module`** — a model class: `__init__` declares layers, `forward` defines the flow.
- **Logits** — raw output scores (pre-softmax). **Softmax** → probabilities.
- **ReLU** — nonlinearity; lets a net learn curves, not just lines.
- **Loss** — how wrong (e.g. **CrossEntropyLoss** for classification; expects logits +
  integer labels).
- **Optimizer** (SGD/Adam) + **learning rate** — how the weights get nudged.
- **The training loop:** `zero_grad → forward → loss → backward → step`. (Clear grads each
  step — they accumulate.)
- **Epoch** = one pass over all data. **Batch** = a chunk processed at once.
- **Embedding** — a learned vector summarising an input (AEF = 64-D per pixel).
- **L2-normalised / cosine** — AEF vectors sit on a unit hypersphere → compare with
  cosine/dot-product; **don't z-score them**.

### Evaluation & rigor
- **Train/test split** — never score on data you trained on.
- **Spatial autocorrelation** — nearby pixels are similar → **random splits leak and inflate
  scores**. Use **spatial-block CV** (the rigor move that wins).
- **Confusion matrix** → **precision** (of flagged, how many real) & **recall** (of real, how
  many caught). **R²** for regression.
- **Threshold baseline vs ML** — always show the simple index first, then beat it with the
  model (the comparison the brief asks for).
- **Change detection** — flag where/when a pixel changed (image differencing, thresholding,
  or sequential **omnibus** methods). **Change-point** — detect *when* a time series shifts.

---

## 9. The "don't get caught" facts (Q&A armour)

- 10 m pixel = **100 m²**, not 10 m².
- C-band **saturates** → can't measure dense tropical biomass; detects loss fine.
- **GRD = no phase → no InSAR/coherence.**
- Random CV **lies** on spatial data → spatial-block CV.
- AEF embeddings are **normalised** → cosine, no re-standardising.
- **RADD already exists** → your edge is ML + fusion + carbon/EUDR framing, not "first."
