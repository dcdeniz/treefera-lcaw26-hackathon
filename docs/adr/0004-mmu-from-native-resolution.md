# ADR-0004: Derive the minimum mapping unit from real resolution

- **Status:** Accepted
- **Date:** 2026-06-25
- **Workstream:** pipeline (amends BUILD_CONTRACT §3.9)

## Context

§3.9 says "drop components `< 0.2 ha` (32 pixels at 25 m)". These three figures are mutually
inconsistent:

- 0.2 ha = 2,000 m²; at 25 m a pixel is 625 m² → **0.2 ha ≈ 3.2 pixels, not 32.**
- 32 pixels at 25 m = 20,000 m² = **2 ha**, not 0.2 ha.
- For 32 px to equal 0.2 ha, the pixel size would have to be ~8 m.

They are off by ~10×. MMU directly controls how many alerts survive (and the "≥50 components"
gate), so this must be resolved, not guessed.

## Decision

Keep the **0.2 ha area target** (defensible, per Reiche et al. 2021). **Derive the pixel
threshold at runtime** from the tile's actual pixel area:

```
min_pixels = ceil(2000 m² / pixel_area_m²)
```

Never hardcode 32. Record the resolved `pixel_size_m` and `min_pixels` in the run log /
`outputs/README.md`. The "≥50 surviving components" gate is treated as **advisory** until the
real component count is known on first run.

## Consequences

- ➕ Correct MMU whether GEE delivered 25 m or a resampled grid.
- ➕ Self-documenting and reproducible.
- ➖ The §3.9 component-count gate may need recalibrating after the first real run.
