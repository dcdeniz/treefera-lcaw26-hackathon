# ADR-0005: Hansen is a cross-reference, not ground truth

- **Status:** Accepted
- **Date:** 2026-06-25
- **Workstream:** validation (amends BUILD_CONTRACT §5)

## Context

§5 validates SAR alerts against Hansen GFC `lossyear == 23` and computes producer's/user's
accuracy as if Hansen were truth. But **Hansen is optical-derived** and systematically
under-reports / lags under persistent cloud — which is *precisely* the condition this whole
project exists to overcome. So a SAR alert that Hansen does **not** confirm may be a genuine
clearing optical missed (the thesis), not a false positive. Treating Hansen as absolute truth
therefore penalises SAR's core advantage. SPOT high-res (now downloaded) is an independent
visual check but is single-date (2022-04-23).

## Decision

- Report agreement with Hansen as a **cross-reference metric**, explicitly *not* absolute truth.
- **Adjudicate disagreements against SPOT** where it covers the sample; otherwise label
  `uncertain` and exclude from the accuracy computation (per §5).
- Validation against Hansen is **autonomous** (objective raster lookup); SPOT is a **secondary
  spot-check**, not mandatory 100-point human labelling.
- In the write-up, frame cloud-only SAR detections (SAR yes / Hansen no, SPOT-confirmed) as a
  **feature**, not an error.
- The §4.4 pass thresholds (UA ≥ 0.75, PA ≥ 0.65, F1 ≥ 0.70) are reported with this caveat.

## Consequences

- ➕ Honest accounting that does not punish SAR for seeing through cloud.
- ➕ Uses the now-available SPOT as the tie-breaker it's suited for.
- ➖ "Accuracy" headline numbers carry an asterisk — stated plainly (see ADR-0007).
