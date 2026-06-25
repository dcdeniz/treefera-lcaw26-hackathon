# ADR-0002: Single linear agent; reject the 6-agent split

- **Status:** Accepted
- **Date:** 2026-06-25
- **Workstream:** orchestration

## Context

`BUILD_CONTRACT.md` §2 proposes decomposing the build into six specialised agents
(A Data Prep → B Calibrate/Filter → C Change Detection → D Validation → E Map, F Orchestrator)
with per-agent wall-time estimates of 15–60 min. But the actual PALSAR tiles are **~5.3 MB**,
so the whole pipeline runs in **seconds to a couple of minutes**, not hours. The pipeline is
strictly serial (A→B→C→D→E); only D∥E overlaps, and the real cost is the *serial* C↔D
threshold-tuning loop. Inter-agent handoff overhead would not amortise.

## Decision

Build as a **single linear agent** executing §3 steps in order. Retain §4 handoff contracts as
**interface / validation-gate definitions** (so any stage can be re-run in isolation), not as
process boundaries. A human (the "F" role) reviews the **C→D validation gate** and owns the
**bounded threshold-tuning loop (≤2 iterations)** before escalating.

## Consequences

- ➕ No orchestration overhead; simpler to reason about and debug under time pressure.
- ➕ Gates and idempotency from §3/§4 are preserved as checks.
- ➖ Forgoes nominal parallelism — irrelevant at this data size.
