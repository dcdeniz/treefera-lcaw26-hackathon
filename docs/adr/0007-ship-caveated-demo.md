# ADR-0007: Ship a caveated demo over blocking on validation gates

- **Status:** Accepted
- **Date:** 2026-06-25
- **Workstream:** delivery (resolves BUILD_CONTRACT §8.6)

## Context

§4.4 / §5 define pass thresholds (UA ≥ 0.75, PA ≥ 0.65, F1 ≥ 0.70, alert area ∈ [0.2 %, 8 %]).
§8.6 asks: if validation fails, do we block on the §10 fallbacks or ship the failing map with
caveats? The project's entire ethos — and the "alert layer, not regulatory product" framing —
is honesty over polish.

## Decision

**Always ship the demo.** On a gate miss, first run the bounded threshold-tuning loop (≤2
iterations, ADR-0002). If gates still miss, present the **real numbers with honest caveats**
rather than blocking. A demoed F1 = 0.62 with a clear statement of limitations beats no demo —
and beats a quietly-inflated number.

## Consequences

- ➕ Guaranteed working pitch artefact; consistent with the honesty stance held throughout.
- ➕ The tuning log itself becomes pitch material ("we moved −2.0 → −3.0 dB because…").
- ➖ Requires disciplined, upfront disclosure of any missed gate in the demo and talk.
