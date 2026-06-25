# ADR-0003: Blocking DN-vs-dB pre-flight before calibration

- **Status:** Accepted
- **Date:** 2026-06-25
- **Workstream:** pipeline (amends BUILD_CONTRACT §3.4)

## Context

§3.4 calibrates `gamma0_dB = 10·log10(DN²) − 83.0`. This is correct **only** for the raw JAXA
PALSAR mosaic DN product. Our tiles came from **Google Earth Engine** (`real-data/palsar_gee/`),
which may already deliver calibrated dB/γ⁰. Applying the formula to data that is already in dB
produces garbage — and it is the single highest-risk silent failure in the build.

## Decision

Add a **blocking pre-flight** (H0:00, before §3.4): read each tile's dtype + value range.

- Integer DN in the hundreds–thousands → **apply** the formula.
- Float values already in `[−35, 5]` → data is **already dB**; **skip** the formula.

`src/config.py` carries an explicit `PALSAR_IS_DN` (or `CALIBRATED`) flag derived from this
check, and the §3.4 histogram gate (`[−35, 5] dB`) remains as the post-condition.

## Consequences

- ➕ Prevents the most likely catastrophic-but-silent calibration error.
- ➕ Makes the assumption explicit and recorded.
- ➖ One extra inspection step (trivial).
