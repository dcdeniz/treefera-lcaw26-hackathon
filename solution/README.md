# Cloud-Proof Forest Carbon Integrity

**Treefera LCAW26 hackathon — Theme G (SAR / see-through-the-clouds), carbon-integrity framing.**

> Treefera is the trust layer for nature finance — but it can't verify what it can't see,
> and the most valuable rainforest carbon sits under the cloudiest skies on Earth (Congo
> Basin, Borneo), where optical satellites are blind 60–90% of the year. We built the
> cloud-penetrating verification layer: a per-pixel model that fuses **AlphaEarth embeddings**
> with **Sentinel-1 radar** to map forest, evaluated with **spatially-honest** cross-validation
> and cross-checked against **Hansen** forest-loss.

Built and verified on the Chablis (France) demo bundle. The real cloudy-tropics data drops
into the *same loaders* on the day — see "Swapping in the real data" below.

---

## What it does

```
load + co-register (io_data) ─▶ despeckle SAR (sar) ─▶ fuse 64 AEF + 3 SAR (features)
        ─▶ spatial-block CV (spatial_cv) ─▶ RandomForest train/eval (model) ─▶ figures + metrics
```

All four products (AEF, S1, LULC label, Hansen) cover the same AOI in different CRS /
resolution; `reproject_match` snaps them to one grid so a pixel means the same patch of
ground everywhere — the prerequisite for fusion.

## Run it

```bash
hackathon-demo/.venv/bin/python -m solution.run    # ~75s, writes solution/outputs/
```

## Results (Chablis demo, honest spatial-block CV)

Four-model comparison — does SAR carry signal, and does it add to the embeddings?

| model | accuracy | macro-F1 | forest-F1 |
|---|---|---|---|
| baseline (majority) | 0.72 | 0.17 | 0.00 |
| SAR only (3 feat) | 0.83 | 0.43 | **0.82** |
| AEF only (64) | 0.95 | 0.68 | 0.93 |
| AEF + SAR (67) | 0.95 | 0.68 | 0.94 |

Few-shot forest from embedding similarity (no model trained): forest-F1 **0.84 from 5 labels**,
**0.87 from 10**, vs 0.93 fully-supervised; ROC-AUC 0.97. Runtime: classifier ~75 s on a laptop.

## Findings (what we can defend)

1. **Spatial validation changes the story.** Random-CV macro-F1 **0.89** → honest spatial-block
   CV **0.68**. Accuracy barely moves (a dominant class hides it); the leakage lives in the
   minority classes (Water, Rangeland) a random split lets you silently fake. *(fig 05, 04)*

2. **SAR works alone, but the embeddings subsume it.** SAR-only detects forest at F1 **0.82**
   (vs 0.00 baseline) — radar genuinely carries forest structure. But on top of AlphaEarth it
   adds **~0.004** F1: the embedding already fused Sentinel-1. SAR's *unique* value is therefore
   **temporal change detection**, which a single annual composite can't exercise. *(fig 08, 06)*

3. **Forest from a handful of labels.** AEF vectors are L2-normalised, so cosine similarity to a
   forest prototype maps forest at F1 **0.87 from ~10 labelled pixels** — ~94% of the supervised
   score, zero training. The label-efficiency that makes data-scarce regions tractable. *(fig 10, 11)*

## Honest verdict

The forest/land-cover **mapper works and is rigorously validated** (forest precision 0.92 /
recall 0.96; few-shot F1 0.87). What is **not** proven: cloud-penetrating *deforestation* —
that needs multi-temporal SAR over a deforesting tropical AOI, which the demo (single-year,
French farmland, ~no loss) cannot supply. We prove the *static* half ("radar + embeddings map
forest where optical is blind"); the *temporal* half awaits the day's data.

## Outputs (`solution/outputs/`)

| File | Shows |
|---|---|
| `01_aef_pca.png` | 64-D AlphaEarth embeddings → PCA false colour |
| `02_sar_despeckle.png` | Sentinel-1 VV Lee-filter speckle removal |
| `03_landcover.png` | predicted land cover vs ESRI truth |
| `04_confusion_spatial.png` | per-class confusion (spatial CV) |
| `05_cv_gap.png` | random vs spatial CV — the leakage |
| `06_sar_value.png` | AEF vs AEF+SAR ablation |
| `07_importance.png` | feature importances (AEF vs SAR) |
| `08_sar_vs_aef_comparison.png` | baseline / SAR-only / AEF / fused |
| `09_sar_only_forest.png` | SAR-alone forest map vs truth |
| `10_embedding_similarity.png` | few-shot forest via cosine similarity |
| `11_label_efficiency.png` | forest-F1 vs # labels |
| `metrics.json` · `sar_comparison.json` · `embedding_search.json` | all numbers |

Regenerate: `python -m solution.run`, `… compare_sar`, `… embedding_search` (then `… export_web` for the demo).

## Swapping in the real data (on the day)

The pipeline is AOI/region-agnostic. To run over Congo/Borneo:

1. Point `io_data.py` paths at the real tiles (same product types: AEF, S1, LULC, Hansen).
2. **Multi-year** AEF/S1 unlocks the half this single-year demo can't show:
   **change detection** — embedding/backscatter deltas between years → forest-loss map →
   validate against Hansen/RADD → **catch the clearing optical missed**.
3. Multiply detected loss × a biomass density (GEDI canopy height / a published AGB map) →
   **tonnes of carbon at risk** = the carbon-MRV product.

## Honest limitations (say these before a judge does)

- Demo AOI is French farmland with ~no deforestation, so the *change-detection* half is built
  but not yet exercised — it needs the multi-year tropical data.
- Sentinel-1 here is **GRD** (amplitude only) → no InSAR/coherence (needs SLC).
- C-band **saturates** in dense forest → great for *detecting loss*, blind to dense *biomass*
  (that's why carbon density comes from GEDI, not radar).
- **RADD** already runs operational S1 deforestation alerts — our edge is the ML + the
  carbon/EUDR verification framing, not "first to see through clouds."

## 5-minute pitch outline

1. **Hook** — "Optical went dark for four months. We watched the whole time." (cloud-blindness map)
2. **Stakes** — carbon-market credibility crisis + EUDR; verification is Treefera's business.
3. **Build** — embeddings + radar → forest, one grid, one model.
4. **Rigor** — the spatial-CV gap (fig 05): why our 0.68 beats someone else's fake 0.97.
5. **Insight** — embeddings already fuse the radar (fig 06); SAR's value is temporal.
6. **Product** — detected loss × biomass = carbon at risk → the verification layer for the tropics.
