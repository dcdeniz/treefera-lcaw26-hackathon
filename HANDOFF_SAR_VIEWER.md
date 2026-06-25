# Handoff — SAR isometric viewer + honesty pass (pick up here)

> One-shot brief for the next agent. Self-contained; you shouldn't need prior chat history.
> Context lives in `conversations/` (append-only channel) + `mcp/README.md` + the ADRs in `docs/adr/`.

> **STATUS PIN — 2026-06-25, after the cloud_nobs wire (mcp/Claude, overtaking shift)**
> - ✅ **§1 (cloud blind-spot layer)** is DONE. Wired in `web/public/qgis/map.html` (commit
>   `59b77bf` on `main`): new `cloud_nobs` raster source/layer above `optical`, first entry in
>   `REV` with `curve: t => clamp(1 - t*1.35)`, label `Cloud blind-spot · no clear obs (2020-09)`.
>   Verified via HTTP (asset 200, JS parses, draw order correct). **Not visually screenshot-tested
>   in this session** — no headless browser was wired.
> - 🟡 §3 (uncommitted work) — superseded. The map.html + assets are on `main`; only the
>   `clouds.png` + `clouds_png()` in `render_overlays.py` remain as leftover dead code (harmless,
>   prune when convenient).
> - 🔓 Channel: latest message is `conversations/0015-mcp-to-all--cloud-nobs-layer-wired.md`.
>   Open items still in §4 (sparkline, stale `alert_runs` doc); see that channel message + §4
>   below for the carry-over list.
> - Honesty constraints in §5 are UNCHANGED — protect them.

## 0. Where we are in one paragraph
The QGIS-MCP → Mongo → REST stack shipped (PR #7, merged to `main`). The homepage (`/`) now renders an
**isometric MapLibre SAR viewer** (`web/public/qgis/map.html`, embedded via an iframe in
`web/src/components/scene/ThroughTheClouds.tsx` when `mode==='live'`; `/demo` keeps the old prism scene).
The viewer tells the gradient story **OSM underlay → real Sentinel-2 optical (+ real cloud blind-spots)
→ SAR HV imaging → HV-loss → extruded deforestation alerts**, with analyst chrome (layers, dB legends,
coordinate + identify readout, attribute popups). A multi-agent honesty pass (conv 0011–0013) corrected an
overclaim. **There is uncommitted work on the `main` working tree** (see §3) and **one 5-minute wiring task
left** (§1). Production `next build` passes.

## 1. ⏭️ IMMEDIATE NEXT TASK — wire the real cloud-blind-spot layer
Infra just delivered **`web/public/qgis/cloud_nobs.png`** (1574×1628 RGBA) = real **`n_obs(2020-09)==0`**
(pixels with zero clear optical observations that month = the honest cloud blind-spot). It is **not yet
wired** into `map.html`. Add it as a peelable layer:
- Same georef as the optical: `OPTICAL_COORDS` already defined in `map.html`
  (`[[113.429105,-0.926635],[113.570921,-0.926635],[113.570921,-1.073316],[113.429105,-1.073316]]`).
- In `map.on('load')`, add an image source/layer `./cloud_nobs.png` **drawn just above `optical`**
  (so: OSM → hv_2023 → loss → optical → **cloud_nobs** → alerts).
- Add it to the `REV` array (top of the list) with a **fade-first** curve, e.g.
  `curve: t => clamp(1 - t*1.35)` (clouds peel first, then optical fades, then SAR emerges).
- Label it **"Cloud blind-spot · no clear obs (2020-09)"**.
- Verify: `curl localhost:3000/qgis/cloud_nobs.png` → 200, then reload `localhost:3000/` and drag the
  gradient. JS sanity: `node -e "new Function(require('fs').readFileSync('web/public/qgis/map.html','utf8').match(/<script>([\s\S]*?)<\/script>/g).pop())"`.

## 2. Running infrastructure (already up on this machine)
| Thing | Where | Notes |
|---|---|---|
| Next dev server | `:3000` | `npm run dev --prefix web`. Homepage = the viewer. |
| QGIS-MCP container | `:8100` MCP, `:18080` REST, `:6080` noVNC | `docker compose -f mcp/compose.yml ps`; built `linux/amd64` (emulated on Apple Silicon). |
| Express product API | `:4000` | `npm start --prefix mcp/api` (reads `through_the_clouds`). Not needed for the homepage. |
| MongoDB Atlas | `through_the_clouds` | `alerts` (2dsphere, 54), `alert_runs`. URI in `web/.env.local` (gitignored). |

The homepage viewer is **fully static** (reads `web/public/qgis/*` only) — no backend needed; works on
Vercel CDN. Keep it that way (INFRA_CONTRACT §1.3 static-first invariant).

## 3. Uncommitted work on `main` (needs commit → PR → merge)
All on the working tree, NOT yet committed (I held the commit to land the cloud layer first):
- `web/public/qgis/map.html` — `?embed=1` mode (hides redundant HUD on the homepage; `/map` standalone
  keeps full HUD); honesty-reframed copy; **real optical wired, procedural clouds dropped**.
- `web/public/qgis/optical_real.png`, `cloud_nobs.png` — real S2 assets from infra (uncommitted, untracked).
- `web/scripts/render_overlays.py` — still generates the now-unused `clouds.png` (procedural). **Cleanup:**
  either delete `clouds.png` + remove `clouds_png()` from the script, or leave it (harmless). Your call.
- `web/src/components/scene/ThroughTheClouds.tsx` — homepage iframe `src="/qgis/map.html?embed=1"`.
- `conversations/0011-mcp-*.md`, `0012-mcp-*.md`, `0013-mcp-*.md`.

**Commit flow used in this repo:** branch off `main` (don't commit to `main` directly), `gh pr create`,
`gh pr merge --merge` (the repo owner can `--admin` if branch-protected). Co-author trailer:
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. PR body ends with the Claude Code
trailer. Scope the staged set explicitly (no `node_modules`, `mcp/outputs/`, `vendor/`, secrets — all
gitignored).

## 4. Open decisions (waiting on humans / other agents)
1. **Per-alert sparkline is fabricated** (frontend, conv `0012-frontend-to-all--fake-monthly-sparkline`).
   `web/src/components/scene/AlertDrawer.tsx:52-53` renders a "Δ HV monthly · 2023" chart from
   `delta_series`, which is **flat `[mean]×12` live** / **random in `mock.ts`** — not real (PALSAR is an
   *annual* mosaic). Options: **(A)** cut the sparkline + drop `delta_series` from `web/src/lib/types.ts:19`
   (recommended; time-series isn't a Challenge-G requirement); **(B)** frontend wires a **real monthly
   Sentinel-1 VH** series from the `sentinel1_mpc` cube. Needs the frontend owner's call + infra's OK on
   the shared type. **Not yet decided.**
2. **Designer's reply** — the user asked to poll for it; none has landed in `conversations/` yet. Keep
   polling (a watcher pattern is below).
3. **No 40–60% cloud frame exists** in `real-data/sentinel2/` (infra `0013`): the cube is monthly-median,
   cloud-masked by design (~14% max residual, no SCL band). A real pristine cloudy single-date frame would
   need an external L2A pull (Copernicus/Planetary Computer/EE). Decision so far: **don't** — the reframed
   copy + `n_obs` mask is honest and sufficient. Only revisit if a human wants the external pull.
4. **Stale `alert_runs` doc** — one pre-fix `qgis-mcp` doc (top-level `git_sha=216d40a`, no `provenance`)
   should be `deleteOne`'d (infra `0010`). The deletion was **blocked** (shared-DB mutation needs explicit
   user authorization). Harmless — infra's `{aoi_id, git_sha, source:"web-ingest"}` filter already
   neutralizes the clobber. Get the user's OK before deleting.

## 5. Honesty constraints (ADR-0005 / ADR-0007 — don't re-break these)
Real S2 stats over the AOI (pipeline, conv `0011-frontend`): **~29% cloud-blind in a median month**, but
**optical sees 99.9% of the AOI over a full year**. So:
- ❌ DON'T claim "permanent cloud / optical blind-spot / cloud-hidden alerts." A judge will catch it.
- ✅ DO frame SAR's edge as **timeliness**: it flags loss *on the overpass it happens*; optical waits
  months for clear pixels and composites dates. Answers Challenge G ("match/beat optical where it matters").
- The "SAR-only" alerts = **"not in Hansen's annual map"** (a mix of real misses + SAR false positives),
  NOT "cloud-hidden." The viewer copy + labels were already corrected to this; keep it.
- `pipeline_passed = false` is honest (F1 0.344 vs the 0.70 gate). Ship caveated, never inflate.
- The homepage footer in `ThroughTheClouds.tsx` (*"Optical can't see this. SAR already did."*) still
  overclaims — flagged to the frontend owner (conv `0012-mcp`); soften to the timeliness framing.

## 6. Key files
- **Viewer:** `web/public/qgis/map.html` (MapLibre, self-contained, CDN libs). Assets in
  `web/public/qgis/`: `optical_real.png`, `cloud_nobs.png`, `hv_2022.png`, `hv_2023.png`, `loss.png`,
  `alerts_2023.geojson`, `aoi.geojson`, `overlays_manifest.json` (bounds + metrics).
- **Overlay renderer:** `web/scripts/render_overlays.py` (offline, geo venv `hackathon-demo/.venv`):
  PALSAR HV + HV-loss → georeferenced PNGs. Run: `hackathon-demo/.venv/bin/python web/scripts/render_overlays.py`.
- **Homepage:** `web/src/app/page.tsx` → `LiveScene` → `ThroughTheClouds.tsx` (iframe for `mode==='live'`).
  Standalone full-screen viewer: `web/src/app/map/page.tsx` (`/map`).
- **The detector (source of truth):** `src/` (PALSAR HV two-date Δ-threshold). `mcp/config/detect.py` is a
  verified dual-backend port (identical 54 alerts). `outputs/alerts/alerts_2023.geojson` is the reference.
- **Stack + ADRs:** `mcp/README.md`, `BUILD_CONTRACT.md` §12, `docs/adr/`.

## 7. Channel state (`conversations/`, newest first)
- `0013-infra-to-mcp-frontend` — no 40–60% cloud frame in this cube (median-only).
- `0013-mcp-to-infra` — proposed the `n_obs==0` mask solution (infra delivered `cloud_nobs.png`).
- `0012-frontend-to-all` — sparkline is fabricated (cut vs wire-real S1).
- `0012-infra-to-mcp` — cube cracked (cloud-masked by design) + delivered `optical_real.png` + the zarr
  v3 opening incantation (`group=…/cube.zarr`, `consolidated=False`).
- `0011-frontend-to-all` — the honesty reframe (29% monthly / 99.9% annual; timeliness).
- `0011-mcp` / `0012-mcp` / `0013-mcp` — my replies (reframed viewer, accepted optical, proposed n_obs).
- Protocol: one file per message, append-only, `NNNN-<from>-to-<to>--<slug>.md`, increment from the
  highest number (numbers have collided when agents work concurrently — that's fine, slugs differ).

## 8. Poll-for-replies pattern (background watcher)
```bash
cd <repo>
base="$(ls conversations/*.md | sort)"
for i in $(seq 1 120); do sleep 20
  now="$(ls conversations/*.md | sort)"
  [ "$now" != "$base" ] && { echo NEW; comm -13 <(echo "$base") <(echo "$now"); exit 0; }
done; echo ELAPSED
```
Run with `run_in_background: true`; it wakes you when any agent (designer included) posts.

## 9. Gotchas
- Shell is **zsh**: unquoted `$VAR` does NOT word-split (use explicit args or `${=VAR}`); unmatched globs
  error (guard with `2>/dev/null`).
- `cd` in compound Bash commands can trigger a permission prompt — prefer absolute paths / `--prefix`.
- The working dir can persist into `vendor/` from earlier `cd`s — always `cd <repo>` first.
- `next build` and `next dev` both lock `web/.next` — stop the dev server before a production build.
- `map.html` is a static asset (not compiled by Next) — copy edits there don't need a rebuild.
- Mutating the shared Atlas DB requires explicit user authorization (auto-mode classifier blocks it).

— handed off by the mcp agent
