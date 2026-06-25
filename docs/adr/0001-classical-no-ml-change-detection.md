# ADR-0001: Classical two-date L-band HV change detection (no ML)

- **Status:** Accepted
- **Date:** 2026-06-25
- **Workstream:** pipeline

## Context

The thesis is detecting 2022–2023 deforestation through persistent cloud over Central
Kalimantan. Two routes:
1. Deep multitemporal ML (UTAE-style temporal-attention U-Net) — heavy, GPU-hungry, needs
   labelled training data, days not hours.
2. Classical two-date backscatter-drop thresholding on annual mosaics.

Evidence from our own prep: a RandomForest study on the Chablis demo found AEF embeddings
already **subsume** static Sentinel-1 (AEF-only forest-F1 0.93 vs AEF+SAR 0.94; fusion
Δaccuracy **+0.001**). So SAR's marginal value is *temporal change*, not static classification —
which a 2-date delta captures directly. Inputs are annual PALSAR-2 **L-band HV** mosaics
(2017–2025), ~5 MB tiles.

## Decision

Implement the classical **two-date (2022 vs 2023) L-band PALSAR HV backscatter-drop threshold**
per `BUILD_CONTRACT.md` §3. **No ML training.** L-band HV is chosen for canopy penetration
(higher biomass ceiling than C-band) and volume-scattering sensitivity to forest structure.

## Consequences

- ➕ Runs in seconds on the tiny tiles; fully reproducible; every threshold cited and
  falsifiable; honest "alert layer, not regulatory product."
- ➖ No learned generalization; thresholds need tuning (see ADR-0002, ADR-0007).
- ➖ HV-only cannot classify oil-palm species — emit `candidate_plantation_frontier` as a
  proxy flag only, never assert species.
