# Glossary — SAR Deforestation Detection

Plain-English explanations of the data-science and geography terminology used
across this project. The app detects forest clearing in Borneo using **SAR
(radar)** satellite data, so most terms come from radar remote sensing.

---

## 1. The core radar signal: SAR, HV, and dB

**SAR (Synthetic Aperture Radar)** — A satellite that fires its own radio waves
at the ground and measures what bounces back. Unlike a camera, it makes its own
"light," so it works at night and **sees straight through clouds** — the whole
premise of this project, since Borneo is one of the cloudiest places on Earth.

**Backscatter** — How much of the radar pulse bounces back to the satellite.
Standing trees (trunks, branches) scatter a lot of energy back; bare ground or
water reflects it away. So **more backscatter ≈ more woody biomass**.

**HV / HH / VV / VH — polarization** — Radar can send and receive waves in
vertical (V) or horizontal (H) orientation. The two letters mean
"**transmit-receive**." **HV** = transmit Horizontal, receive Vertical. HV is the
workhorse for forests because the "cross-polarized" return is produced by the
chaotic multi-bounce scattering inside a leafy/branchy canopy — so HV is
especially sensitive to how much vegetation structure is present. When trees are
cleared, HV drops sharply.

**γ⁰ (gamma-nought) dB** — The calibrated backscatter value. Radar return is
converted into **decibels (dB)**, a logarithmic scale. Forest sits around −6 to
−9 dB; water and bare ground are much lower (−20 dB and below). The pipeline
formula `γ⁰ = 10·log₁₀(DN²) − 83.0` converts raw sensor counts to dB.

**DN (Digital Number)** — The raw, uncalibrated pixel value straight off the
sensor before it's turned into physically meaningful dB.

**L-band vs C-band** — The radar's wavelength.
- **L-band** (long waves, ~24 cm — Japan's PALSAR-2) penetrates the canopy and
  reaches **branches and trunks**, so it measures actual wood. This is the main
  signal.
- **C-band** (short waves, ~5 cm — Europe's Sentinel-1) bounces off the **top of
  the canopy** and "saturates" (stops responding) in thick tropical forest —
  less useful for measuring loss, but faster/more frequent.

---

## 2. The detection method: Δ HV ("delta HV")

**Δ (delta) = change between two years.** "Delta HV" literally means *the change
in HV backscatter*. The whole detector is: take the HV radar image from 2022 and
from 2023, subtract them, and look for big drops.

In the UI (`AlertDrawer.tsx`) each alert shows three numbers, all in dB:

| Label | Field | Meaning |
|---|---|---|
| **Baseline** | `baseline_hv_db` | The HV level *before* clearing (the 2022 forested value, ~−9 to −13 dB) |
| **Mean Δ** | `mean_delta_hv_db` | Average backscatter drop across the alert patch (e.g. −3.5 dB) |
| **Min Δ** | `min_delta_hv_db` | The single biggest drop anywhere in the patch |

A **negative delta = signal got weaker = wood disappeared = likely clearing.**
The detection **threshold** is `Δ HV ≤ −2.0 dB`: if the signal dropped by more
than 2 dB, flag it. (Fallbacks tune this to −1.5 dB if too few alerts fire,
−3.0 dB if too many.) The `/information` page describes this in plain words as
"did the radar signal drop by more than 2.5 decibels."

**candidate_plantation_frontier** — A flag for alerts that look like the *start
of a new plantation*: a large patch (≥ 1 ha) **AND** a sharp drop (Δ ≤ −3 dB).
Shown as the **"frontier candidate"** vs **"small clearing"** badge. Caveat the
app is honest about: radar can't tell oil palm from rubber, so this is a
*proxy*, not a species ID.

---

## 3. Image-processing / cleanup terms

**Speckle** — Radar images look grainy/"salt-and-pepper" because of how coherent
waves interfere. The dense fine dots you see in the SAR scene.

**Speckle filter (Lee, Quegan–Yu)** — Named smoothing algorithms that average out
that grain *without* blurring real edges. The pipeline uses Quegan–Yu 5×5 + Lee
7×7 (the numbers are pixel window sizes).

**Co-registration** — Making sure the 2022 and 2023 images line up pixel-for-pixel
on the map. If they're misaligned, subtracting them produces fake change.
(`bilinear resample` = the interpolation method used to nudge them into
alignment.)

**Masks** — Layers that *exclude* areas you don't want flagged: **water mask**
(≤ −24 dB), **non-forest mask** (< −14 dB), **slope mask**, **cloud mask**. These
stop rivers and bare ground from looking like "loss."

**Morphological open / close (3×3)** — Standard image-cleanup ops: "open" removes
tiny stray specks, "close" fills tiny holes, so alerts are clean blobs not
confetti.

**MMU (Minimum Mapping Unit) ≥ 0.2 ha** — The smallest patch worth reporting;
anything smaller is dropped as noise.

**Polygonize** — Convert the cleared-pixel raster mask into vector **polygons**
(outlined shapes) saved as GeoJSON — one outline per alert.

---

## 4. Geography / geospatial terms

**AOI (Area of Interest)** — The study region: a ~20 km × 20 km box in Central
Kalimantan (Borneo). Most stats are expressed as a `% of AOI`.

**bbox (bounding box)** — The four corners of a rectangular area
`[west, south, east, north]`, e.g. `[113.43, −1.07, 113.57, −0.93]` in lon/lat
degrees.

**centroid / centre** — The geometric center point of an alert or the AOI. In
`types.ts`, `centroid: [0,1]` is normalized to a 0–1 box for the isometric
drawing layout (not real coordinates).

**EPSG:4326 / CRS** — A **Coordinate Reference System**. EPSG:4326 is **WGS84**,
the standard latitude/longitude system GPS uses. The pipeline gate "CRS == 4326"
just confirms everything is in plain lat/lon degrees.

**Hectare (ha)** — Area unit, 100 m × 100 m (about 1.5 soccer fields). The
primary unit for "how much forest was lost."

**Pixel** — One cell of the satellite raster grid; pixel-level comparison is used
for accuracy scoring.

---

## 5. Validation & accuracy metrics

From comparing alerts to reference datasets (`BottomStats.tsx`,
`overlays_manifest.json`):

**Cross-check / ground-truth sources:**
- **Hansen GFC (Global Forest Change)** — A famous University of Maryland
  forest-loss map made from *optical* photos. Used as a **cross-reference, not
  ground truth** — because it's photo-based, it *misses clearings hidden under
  cloud* (exactly the gap radar fills). Match rule:
  `lossyear == year−2000 ∧ treecover2000 ≥ 30`.
- **RADD alerts** — Another established radar-based deforestation alert system,
  used to corroborate.
- **SPOT-7** — Commercial high-res (~1.5 m/pixel) optical photos for *manually
  eyeballing* disputed alerts. Classified as forest / cleared / unclear.

**Accuracy scores:**
- **User's accuracy** (≥ 0.75 gate) — Of the patches you flagged, what fraction
  are *really* clearings? (Inverse of false alarms / commission error.)
- **Producer's accuracy** (≥ 0.65 gate) — Of the *real* clearings, what fraction
  did you catch? (Inverse of misses / omission error.)
- **F1** (≥ 0.70 gate) — The harmonic mean balancing the two above into one score.
- **Object precision vs Hansen** — Of your alert *polygons*, what fraction
  overlap a known Hansen-cleared area ("right roughly half the time").

**Confusion-matrix terms:** **TP** (true positive — correctly flagged), **FP**
(false positive — false alarm), **FN** (false negative — missed clearing).

**Gate (§4.4)** — A pass/fail quality check: the run is only accepted if accuracy
metrics clear their thresholds and alert area falls within a sane range (0.2–8%
of AOI). Stops the pipeline shipping garbage.

---

## 6. Satellites referenced

| Satellite | Type | Role |
|---|---|---|
| **PALSAR-2 / ALOS-2** | Japanese L-band radar | **Main signal** — 2022 vs 2023 HV mosaics |
| **Sentinel-1** | European C-band radar | Backup; faster but saturates in thick forest |
| **Sentinel-2** | European optical | The "cloudy photo" view that proves the point |
| **SPOT-7** | Commercial optical (1.5 m) | Manual visual checks |
| **Hansen GFC** | Optical-derived map | Cross-reference dataset |

---

## 7. Regulatory / commercial terms

- **EUDR** — EU Deforestation Regulation; requires proof that palm/timber/etc. is
  deforestation-free. The market driver for the whole product.
- **NDPE** — "No Deforestation, No Peat, No Exploitation," a palm-oil supply-chain
  commitment.
- **Plantation frontier** — The expanding edge where forest is being converted to
  oil-palm plantation.

---

## 8. How the alert polygons are made (and why they help)

The alerts you see on the map start life as a grid of radar pixels and end as
clean vector **polygons**. Here is the actual pipeline (`src/detect_change.py`),
step by step.

### Pixels → mask: thresholding Δ HV

The detector loads the two despeckled HV rasters and subtracts them in dB space,
then keeps only pixels that dropped enough *and* aren't water or pre-existing
non-forest (`src/detect_change.py:30-31`):

```python
delta = hv23 - hv22
raw = (delta <= config.DELTA_DB) & ~water & ~nonforest & np.isfinite(delta)
```

with the thresholds from `src/config.py`: `DELTA_DB = -2.5` (loss trigger),
`WATER_DB = -24.0`, `NONFOREST_DB = -14.0`. The result `raw` is a true/false
**raster** — a noisy pixel cloud, not yet a shape.

### Mask → clean blobs: morphology + minimum size

Raw thresholding leaves speckle and pinholes, so the mask is cleaned with
morphological **opening** (remove stray specks) and **closing** (fill tiny holes),
then split into connected blobs with 8-connectivity labelling
(`src/detect_change.py:33-38`):

```python
a = binary_opening(raw, structure=np.ones((3, 3)))
a = binary_closing(a, structure=np.ones((3, 3)))
lab, _ = label(a, structure=np.ones((3, 3)))  # 8-connectivity
sizes = np.bincount(lab.ravel())
keep = [i for i in range(1, len(sizes)) if sizes[i] >= min_pixels]
cleaned = np.where(np.isin(lab, keep), lab, 0).astype("int32")
```

`min_pixels` is derived from the **Minimum Mapping Unit** (`MMU_HA = 0.2`),
converted to a pixel count using the real on-the-ground pixel area — so any blob
smaller than ~0.2 ha is dropped as noise.

### Blobs → polygons: the polygonize step

Each surviving blob is traced into a vector outline with **rasterio's
`features.shapes`**, which walks the raster and emits one GeoJSON-style geometry
per connected component (`src/detect_change.py:52`):

```python
for geom, val in features.shapes(cleaned, mask=valid_mask, transform=meta["transform"]):
    cid = int(val)
    comp = cleaned == cid
```

The `transform=meta["transform"]` argument is what turns pixel row/column indices
into real **lat/lon coordinates** (EPSG:4326), so the polygon lands in the right
place on Earth.

### Attaching the numbers to each polygon

While it has each blob's pixels in hand, the code computes the per-alert stats you
see in the drawer — straight from the radar values inside that polygon
(`src/detect_change.py:53-71`):

- **`area_ha`** = pixel count × real pixel area ÷ 10,000
- **`mean_delta_hv_db`** = `np.nanmean` of Δ HV inside the blob
- **`min_delta_hv_db`** = `np.nanmin` of Δ HV (the sharpest drop)
- **`baseline_hv_db`** = mean 2022 HV (the pre-clearing level)
- **`candidate_plantation_frontier`** = `area_ha >= 1.0 and mean_d <= -3.0`
- **`hansen_gfc_2023`** = does the blob overlap Hansen's optical loss map?

The rows become a **GeoDataFrame** and are written out as GeoJSON
(`src/run.py:52`, plus one per year in `src/multiyear.py`):

```python
gdf.to_file(config.ALERTS_DIR / "alerts_2023.geojson", driver="GeoJSON")
```

### Why polygons help the analysis

Turning pixels into polygons is what makes the output **usable, defensible, and
comparable**:

1. **From "noise" to "events."** A threshold alone gives millions of scattered
   pixels. Grouping them into discrete shapes means you can say "**54 clearings**"
   instead of "a fog of flagged pixels" — each one a countable, nameable object.
2. **Real-world units.** Once it's a polygon you can measure **area in hectares**,
   find its **centroid**, and report "this patch is 3.2 ha" — the language
   regulators, traders, and carbon projects actually use.
3. **Per-object evidence.** Every polygon carries its own Δ HV, baseline, and
   cross-checks, so each alert can be **audited on its own** ("this one dropped
   4 dB over 5 ha and matches Hansen") rather than judged as a blurry whole.
4. **Object-level validation.** Polygons let you ask "does each *alert* overlap a
   known cleared area?" (object precision vs Hansen) — a fairer, more meaningful
   test than counting raw pixel agreement.
5. **Filtering signal from junk.** The MMU size cut and morphology only make sense
   on grouped objects: they remove tiny specks and fill holes so you keep **real
   clearings, not speckle**.
6. **Interoperability.** GeoJSON polygons drop straight into QGIS, the web map,
   `geopandas`, or any GIS — they overlay on plantations, concessions, and
   protected areas for downstream analysis.
7. **Defensibility.** A crisp outline with a number attached is something you can
   put in front of a regulator or in court; a raw probability raster is not.

---

## The one-line version of "delta HV"

*HV* is the radar channel most sensitive to standing trees; the *delta (Δ)* is the
year-over-year change in that channel; a large negative delta (a drop of >2 dB)
means the wood is gone, i.e. **a clearing the clouds were hiding from ordinary
satellites.**
