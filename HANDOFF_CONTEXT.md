# Handoff — Deep context & hard-won knowledge (read alongside HANDOFF_FRONTEND_PIPELINE.md)

This is the **tacit** context from the session that built the pipeline + frontend — the things that
would cost you hours to rediscover. `HANDOFF_FRONTEND_PIPELINE.md` is the *task* handoff; this is the
*why* and the *landmines*.

**Read order:** this → `HANDOFF_FRONTEND_PIPELINE.md` → `docs/adr/0001-0009` → `BUILD_CONTRACT.md` §12 →
`conversations/` (skim 0001→latest). The conversations channel is the live coordination log.

---

## 1. How we got here (the pivots — don't re-walk them)
- Considered **theme H (biodiversity proxy)** — rejected: most crowded/obvious pick, validation is an
  unsolved science problem. Chose **theme G (SAR through clouds)** instead.
- First built a **RandomForest land-cover proxy** (the now-dead `solution/`, Chablis demo data). Its one
  durable result: **AlphaEarth (AEF) embeddings *subsume* static Sentinel-1** (fusion gain +0.001). That
  finding is *why* we pivoted to **classical temporal change detection on PALSAR** — the value is in the
  *transition over time*, not static classification. **`solution/` is superseded — do not resurrect it.**
- The real solution is `src/` (PALSAR HV two-date Δ-threshold) per `BUILD_CONTRACT.md`.

## 2. Hard-won data facts (the landmines)
- **PALSAR is already γ⁰ dB** — the contract's `10·log10(DN²)−83` would double-calibrate to garbage. A
  blocking pre-flight (ADR-0003) caught it; values −23→7 dB, median −7, 99.9% negative. **HV is band 2**
  (the lower-median band) in the tiles.
- **AOI = the HOTSPOT** `[113.4291,-1.0733,113.5709,-0.9266]`, *not* the wide bbox `[113.25..113.75]`.
  The PALSAR tiles are pre-clipped to it and pre-co-registered (no crop/warp needed). Centroids normalise
  to **this** box; infra synced the Mongo `aois` doc to it.
- **~25 m pixels** (0.000225°) → MMU 0.2 ha ≈ **3 px**, not the contract's "32 px" (ADR-0004).
- **8 PALSAR years on disk: 2017–2024** (`real-data/palsar_gee/G_sar_borneo/annual/<year>/`). **Hansen
  lossyear** has per-year counts 2017–2024 → per-year ground truth.
- **Sentinel-2 cube** (`real-data/sentinel2/...zip`): **zarr v3, monthly-median, cloud-MASKED by design**
  (SCL 3/8/9/10 stripped before compositing), EPSG:32749, 108 monthly steps, bands B02–B12 + `n_obs`,
  **no SCL band**. So **no single-date cloudy scene exists here** (would need an external L2A pull — we
  declined). Open it from the zip with `group="sentinel2/G_sar_borneo/2017-01-01_2025-12-31/cube.zarr"`
  (the `group=` is the fix for the `GroupNotFoundError`). Baseline offset **1000 for dates ≥ 2022-01-25**.
- **Sentinel-1 MPC cube** (`real-data/sentinel1_mpc/...zip`) **IS sub-annual** (time + vv/vh/n_obs,
  2017–2025). This is the *only* source for a real **monthly** per-alert signal (relevant if the scrubber
  ever wants sub-annual; PALSAR can't).
- **Download trivia:** gdown rate-limits on bulk; the `CLIENT_*` biomass + SPOT files were
  permission-restricted (needed browser cookies at `~/.cache/gdown/cookies.txt`, since removed). Biomass
  is **out of scope** (PALSAR-only pipeline).

## 3. What the detection numbers actually mean
- 2023: **54 alerts, 136.8 ha, F1 0.34 vs Hansen, object-precision 0.44** (24/54 Hansen-confirmed).
  Threshold sweep: **Δ=−2.5 dB is the F1 peak** (−1.5 floods, −3.0 over-prunes).
- **F1 0.34 is honest, not failure** — Hansen is optical/cloud-limited and 25 m pixel-matching is harsh.
  Lead with **object-precision** and (for the scrubber) **spread-vs-Hansen-progression**, not the pixel F1.
- The alert **polygons are geometrically simple** (median 5 vertices, ~square) — the "dense" look in the
  3D viewer is **spatial clustering** (67% in the NE quadrant) + tall-prism perspective + SAR speckle,
  NOT jagged geometry.
- ⚠️ **Unverified risk:** the NE 67% cluster *could* be partly a single-annual-mosaic acquisition-date /
  moisture seam (a known PALSAR gotcha), not all real clearing. Nobody has overlaid raw 2022/2023 HV on
  the NE block to check for a backscatter seam. **Worth doing** — it's the one thing that could
  embarrass us in Q&A. The QGIS-MCP is the tool to settle it.

## 4. The honesty ledger (this is our differentiation — protect it)
Every overclaim we caught and walked back. Keep doing this:
- "We see deforestation through clouds (novel)" → RADD already does S1 alerts; we're ML/fusion + framing.
- F1 dressed up → reported honestly with the cross-reference caveat (ADR-0005/0007).
- **"Optical can't see this" / "permanent blind-spot" / "cloud-hidden"** → **FALSE annually** (Sentinel-2
  sees 99.9% of the AOI over 2023; only 0.1% never-clear). The defensible claim is **timeliness**: ~29%
  cloud-blind per *single pass*, far worse per overpass. (conv 0011; mcp reframed the whole viewer; I
  softened the footer in 0014.)
- The per-alert **"Δ HV monthly" sparkline is fabricated** (annual PALSAR → no monthly) → being **cut**.
- Don't claim oil-palm species (HV-only can't) — `candidate_plantation_frontier` is a *proxy flag* only.

## 5. Agent dynamics & lane map (you are `frontend`)
- **frontend (you):** `src/` pipeline, `web/` app, the `lib/types.ts` contract.
- **infra:** Mongo (`through_the_clouds`), `web/src/app/api/*`, `web/src/lib/{mongo,alerts}.ts`, Vercel,
  `web/scripts/ingest_run.mjs`. Very responsive; cracked the S2 cube; owns the registry.
- **mcp:** `mcp/` (headless QGIS-via-MCP, Express `:4000`, 2dsphere `alerts` collection). Its `detect.py`
  is a **byte-faithful port of your `src/`** — it *reproduces* the 54 alerts, doesn't *improve* them.
- **Coordination is strict-lane** via `conversations/` (`NNNN-<from>-to-<to>--slug.md`, header
  `# [from → to]`). Never edit another agent's files; each cleans their own Mongo docs.
- ⚠️ **`web/` is co-edited by a human/other party** (the geographic MapLibre viewer in
  `web/public/qgis/map.html`, `DecisionsButton`, etc. appeared externally). **Read before you edit any
  `web/` component, and announce contract changes in-channel first.**
- `alert_runs` accumulated **duplicate run docs** (my "hook it up" POST + infra ingest + mcp ingest) —
  infra hardened ingest (`source:"web-ingest"` filter) + mcp keys on `run_id`; harmless, being deduped.
- `SECRETS.md` (root) holds live Mongo creds + `INGEST_TOKEN`; now gitignored; **nothing was committed**.

## 6. Dead-ends (don't repeat)
- **`neat` / `npx neat.is`** — a service-topology tool; finds 0 nodes on a single-process pipeline. Not a fit.
- **A single cloudy Sentinel-2 frame** — impossible from this cube (median-only). Use `n_obs==0` instead.
- **The RandomForest `solution/`** — superseded by `src/`.
- **Reading the S2 zarr from the zip without `group=`** — `GroupNotFoundError`.
- zsh gotchas: `grep --include=*.tsx` errors (glob expansion); the shell **cwd resets between calls** and
  the venv is at `hackathon-demo/.venv` — use the **absolute** python path in backgrounded/standalone cmds.

## 7. Tooling I set up (reuse it)
- **Headless screenshot harness:** puppeteer is installed in the scratchpad; `shot_routes.js` screenshots
  `/` and `/demo`. This is the only way to *see* the rendered map (no browser MCP wired to the session).
  Use it to verify any `web/` change visually.
- Analysis one-offs in scratchpad: `analyze_alerts.py` (polygon facts), `optical_blindness.py` (S2 cloud
  stats), `tune.py` (threshold sweep). Patterns to copy for the scrubber.

## 8. In-flight right now (pick up exactly here)
- **Channel:** latest is `conversations/0014` (mine — footer fixed, backed mcp's `n_obs` plan). Expect
  infra/mcp to finish the `n_obs` cloud layer (`cloud_nobs.png`). Poll from 0014 onward.
- **Decided, not built — the multi-year scrubber** (see HANDOFF_FRONTEND_PIPELINE §ACTIVE TASK). Cuts the
  sparkline; adds a `year` field to `Alert`. Announce the contract change in-channel before editing.
- **The user's stated next direction:** a **detection-quality lift via the QGIS-MCP** (object-based
  segmentation, Refined-Lee/multitemporal despeckle, texture) to raise F1 above 0.34. Not started. To
  drive the QGIS-MCP yourself you'd need it wired to your session as an MCP server, or use mcp's TS client.
- **Queued human decisions:** commit/PR the `mcp/` stack · `/api/alerts/near` · scrubber scope · the NE-seam check.

## 9. The pitch (everything serves this)
**Impossible** (cloud-blind tropics) → **peel** (reveal SAR beneath cloud) → **scrub** (watch loss spread
over a decade) → **honest proof** (SAR-spread tracks Hansen; ~29% per-pass optical blindness). ADRs and
architecture are Q&A, not the 5-minute pitch. We win on **rigour + honesty + the reveal**, not on a high F1.

— compiled by the frontend/pipeline agent (Claude), handing off in full.
