# [mcp → all] PR #4's QGIS-MCP handoff overlaps the already-shipped pipeline — read before building

- **Date:** 2026-06-25
- **From:** mcp agent (picking up `HANDOFF_QGIS_MCP.md` from PR #4)
- **To:** infra, frontend, + the MCP-study author (sguckiran)

## TL;DR
PR #4 (`HANDOFF_QGIS_MCP.md`) briefs a full **headless-QGIS-via-MCP + Docker + TS client + Express
API + `ttc_*` Mongo** stack. Its stated goal — *"real Mongo-backed alerts at a REST endpoint so the
frontend stops using mock"* — **is already satisfied** by the shipped `src/` pipeline + Next `/api/alerts`
(conv `0004`/`0005`). The handoff appears to predate the pivot back to Next.js **and** the ADR sprint.
Before anyone stands up the Docker stack, let's agree whether we want it at all.

## Where the handoff is stale (verified against the working tree)
1. **`web/` is Next.js 15, not Vite.** Handoff §1/§8 assume Vite + `localhost:5173` + a separate REST
   service. We reverted to Next.js (conv `0001`); the API is co-located route handlers in
   `web/src/app/api/{alerts,health,runs}/route.ts`. A second Express API on `:4000` is redundant.
2. **The frontend already renders REAL data.** Handoff §1 says "currently reads from `mock.ts`".
   `/` fetches `GET /api/alerts` → 54 real alert prisms (conv `0004`). `/demo` keeps mock by design.
3. **The pipeline already exists and ran.** `src/` (classical PALSAR HV Δ-threshold) emits
   `outputs/alerts/alerts_2023.geojson` + `validation_metrics.json` and `web/public/data/alerts.json`.
   The QGIS recipe in handoff §6 recomputes the same thing a heavier way.
4. **Calibration step is wrong for our data.** Handoff §6 `calibrate_a` does `10*log10(DN²)−83`, but
   **ADR-0003** determined our GEE PALSAR is *already gamma0 dB* (`config.PALSAR_IS_DB = True`). The
   handoff's BUILD_CONTRACT references predate the ADR annotations (§12).
5. **Mongo schema collision.** Handoff §7 invents db `ttc` with `ttc_runs`/`ttc_alerts`. We already
   have `through_the_clouds.alert_runs` (seeded, run registered, conv `0005`). Two schemas = drift.

## What's genuinely worth salvaging from the handoff
- The **recipe / config / datasources design** as a *documented productization spine* ("here's how this
  becomes an agent-driven, any-AOI geospatial service") — narrative value, no conflict.
- The **per-feature `2dsphere` `alerts` collection** idea — this maps onto INFRA_CONTRACT §2.3 Option B
  (already flagged as a reviewer decision), inside the EXISTING `through_the_clouds` db, not a new `ttc`.
- The **agentic-MCP angle itself** could be a pitch differentiator ("the pipeline is driven by an MCP
  agent") — but only if we deliberately choose it over the working Python path.

## Proposal (pending human call — see below)
Default: **do not duplicate.** Keep `src/` → `/api/alerts` as source of truth. Reuse the existing
`through_the_clouds` Mongo. If we want the MCP story, build the *design assets* in `mcp/` (recipes,
thresholds, client skeleton) reusing existing schema + correcting ADR-0003 — not the conflicting Docker
stack. Awaiting a decision from the human; will update here once scoped.

— mcp
