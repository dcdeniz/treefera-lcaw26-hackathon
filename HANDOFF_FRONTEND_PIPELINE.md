# Handoff — Frontend / Pipeline lane (Through the Clouds)

You are taking over the **frontend + Python detection pipeline** lane. This is the state as of
2026-06-25. Read this top to bottom; you can be productive in ~10 min.

## Your lane (and what is NOT yours)
- **Yours:** the detection pipeline (`src/`), the web app (`web/`), and the shared data contract
  (`web/src/lib/types.ts`).
- **Not yours:** infra agent owns Mongo + `web/src/app/api/*` + `web/src/lib/{mongo,alerts}.ts` +
  Vercel + `web/scripts/ingest_run.mjs`. The mcp agent owns `mcp/` (QGIS-via-MCP, Express `:4000`).
  Don't edit their files — coordinate via `conversations/`.

## What this is
"Through the Clouds" — **Challenge G** (SAR sees through cloud). Classical, no-ML, two-date
**L-band ALOS-2 PALSAR HV** deforestation detection over the Central Kalimantan, Borneo hotspot
(`[113.4291, -1.0733, 113.5709, -0.9266]`, EPSG:4326), shown as an isometric "peel the clouds" web app.

## Current state — built & working
- **Pipeline `src/`** (`config, sar, detect_change, validate, export_payload, run`):
  - Run: `hackathon-demo/.venv/bin/python -m src.run` (venv = Python 3.13, ADR-0006).
  - 2-date Δ≤−2.5 dB HV-loss → **54 alerts / 136.8 ha (2023)**; validated vs Hansen:
    **F1 0.34, object-precision 0.44** (24/54 Hansen-confirmed).
  - Writes `outputs/alerts/alerts_2023.geojson`, `outputs/alerts/validation_metrics.json`, and
    **`web/public/data/alerts.json`** (the `AlertsPayload` the infra API serves).
- **Frontend `web/`** (Next.js 15, App Router):
  - `/` = LIVE (client-fetches `GET /api/alerts` → real 54 alerts). `/demo` = bundled mock.
  - Isometric SVG scene (`components/scene/*`, `lib/iso.ts`) + "peel" mechanic (cloud→optical→SAR).
  - Run: `cd web && npm run dev` → localhost:3000.
- **Data contract:** `web/src/lib/types.ts` (`Alert`, `Summary`, `Aoi`, `AlertsPayload`). Centroids are
  normalised `[0,1]` within the hotspot bbox for the iso scene; Mongo stores real lng/lat separately.

## Honest findings — DO NOT lose these (they're the spine of our credibility)
- **PALSAR is already γ⁰ dB** → no `10·log10(DN²)−83` calibration (ADR-0003; the pre-flight caught it).
- **~25 m pixels** → MMU 0.2 ha ≈ 3 px (ADR-0004; the contract's "32 px" was wrong).
- **Hansen is a cross-reference, not truth** (ADR-0005). F1 0.34 is *honest*, not a failure: Hansen is
  optical/cloud-limited and 25 m pixel-matching is harsh. We **ship caveated, never inflate** (ADR-0007).
- **Optical is NOT permanently blind annually** — Sentinel-2 sees 99.9% of the AOI over 2023 (only 0.1%
  never-clear). The real SAR edge is **timeliness**: ~29% of the AOI is cloud-blind in a *typical month*,
  and individual overpasses far worse. So pitch "every-pass detection," NOT "optical can't see this."
  (Full numbers: `conversations/0011`.)
- The per-alert **`delta_series` "Δ HV monthly" sparkline is FABRICATED** (annual PALSAR → no real
  monthly) and is being **cut** — see active task.

## ACTIVE TASK — the multi-year temporal scrubber (pick this up)
**Decision made: replace the fake per-alert sparkline with a real AOI time-series "scroll wheel"** that
shows deforestation *spread across t*. Data confirmed feasible:
- **8 PALSAR annual years on disk: 2017–2024** (`real-data/palsar_gee/G_sar_borneo/annual/<year>/`)
  → **7 consecutive year-pairs** = 7 real frames.
- **Hansen lossyear per year** (2017:8950 … 2024:3160 px) → validate each frame + show the SAR-detected
  spread tracks Hansen's progression (a *stronger* validation story than the single-year F1).

**Steps:**
1. **Pipeline (your lane):** loop `src/run` over the 7 pairs (2017-18 … 2023-24). The pipeline is already
   parameterised — generalise `config.PALSAR_2022/2023` to a pair argument. Emit per-year alerts +
   per-year Hansen metrics. Add a **`year` field to `Alert`** (or group alerts by frame) and export a
   multi-year payload to `web/public/data/`.
2. **Coordinate the contract change** — post the `year`-field addition to `web/src/lib/types.ts` to the
   channel (infra serves it via `/api/alerts`; frontend consumes it). **Supersede `conversations/0012`**
   (the sparkline cut-or-real thread) — we're cutting the sparkline and building this instead.
3. **Frontend:** extend the existing year toggle + "replay" button (`components/scene/PeelControls.tsx`,
   `ThroughTheClouds.tsx`) into a **2018→2024 scrubber** that filters/animates alerts by year. Confirm
   ownership of `web/` with whoever's actively editing it (it's being co-edited — e.g. `DecisionsButton`
   was added externally) before you touch their components.

**Honest constraints:** annual granularity (7 frames, not smooth monthly — don't fake sub-annual).
Each frame inherits the same F1-ish caveats; lead with the *spread-vs-Hansen* agreement.

## Coordination protocol (`conversations/`)
- One file per message: `NNNN-<from>-to-<to>--slug.md`, first line `# [from → to] subject`. Append; never
  edit another agent's file. Latest message: **0012** (mine). You are **`frontend`**.
- Other agents: **infra** (Mongo/API/Vercel/ingest), **mcp** (QGIS-MCP stack in `mcp/`, Express `:4000`).
- Reference docs: `BUILD_CONTRACT.md` (+ §12 ADR ratifications), `INFRA_CONTRACT.md`, `docs/adr/0001-0009`.

## Env / data notes
- Pipeline venv: `hackathon-demo/.venv` (Python 3.13). Geo stack installed (rasterio/rioxarray/geopandas/
  scipy/shapely). To inspect cubes: Sentinel-2 extracted at `real-data/sentinel2_extracted/.../cube.zarr`
  (9-yr monthly, B02–B12 + n_obs); Sentinel-1 MPC `real-data/sentinel1_mpc/...` is **sub-annual** (time +
  vv/vh/n_obs) — that's the source if anyone ever wants a real *monthly* per-alert signal.
- `real-data/`, `data/`, `SECRETS.md` are gitignored. Live Mongo creds + `INGEST_TOKEN` in `SECRETS.md`
  (root) and `web/.env.local`. Ingest a run: `POST /api/runs` w/ `x-ingest-token`, or
  `node --env-file=web/.env.local web/scripts/ingest_run.mjs`.

## Decisions queued for the human (not yours to make)
QGIS-MCP detection-quality push · commit/PR the `mcp/` stack · `/api/alerts/near` geospatial demo ·
final greenlight on the scrubber scope · cut-the-sparkline confirmation.

## The 5-minute pitch arc (keep the build serving this)
Impossible (cloud-blind tropics) → **peel** (reveal SAR beneath cloud) → **scrub** (watch loss advance
over a decade) → honest proof (SAR-spread tracks Hansen; ~29% monthly optical blindness). Architecture/
ADRs are Q&A, not the pitch.

— handed off by the frontend/pipeline agent (Claude)
