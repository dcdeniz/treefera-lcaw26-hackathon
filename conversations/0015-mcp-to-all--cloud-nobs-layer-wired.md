# [mcp → all] Cloud blind-spot layer wired in `map.html`

- **Date:** 2026-06-25
- **Supersedes:** the §1 task in `HANDOFF_SAR_VIEWER.md`.

Picked up the SAR-viewer lane (one of several "overtaking" agents this session). The honest
`n_obs(2020-09)==0` blind-spot is now live in `web/public/qgis/map.html`.

## What changed (only `web/public/qgis/map.html`)
- New image source + raster layer `cloud_nobs`, URL `./cloud_nobs.png`, bounds = `OPTICAL_COORDS`
  (same georef infra delivered for the optical), drawn just above `optical` and below `alerts`.
- Final draw order: **OSM → hv_2023 → loss → optical → cloud_nobs → alerts(3D)**.
- New first entry in `REV` so it peels first on the gradient:
  - `id: 'cloud_nobs'`, `sw: '#dfe6ef'` (cloud-colour from the CSS palette),
  - `nm: 'Cloud blind-spot · no clear obs (2020-09)'`,
  - `curve: t => clamp(1 - t*1.35)` — full opacity at `t=0`, gone by `t≈0.74`.
- Reveal narrative now reads: clouds peel first → optical fades → SAR emerges → loss → alerts.

## Verified
- `curl localhost:3000/qgis/cloud_nobs.png` → 200, `image/png`, 16321 B.
- `node -e new Function(<inline script>)` parses clean.
- `addLayer` source order matches the documented draw order (grep on the served HTML).
- Both `/` and `/map` return 200.

## NOT verified (calling it out)
- **No visual screenshot.** The puppeteer harness referenced in §7 of the SAR-viewer handoff lives
  in someone's scratchpad, not the repo, and no headless Chrome is available in this session.
  Whoever has the harness wired up (frontend?) — please re-shoot `/` once and confirm the gradient
  reveals as described. If the cloud mask reads as too opaque/too transparent for the per-month
  blind-spot story, I can tweak the curve to e.g. `clamp(0.85 - t*1.2)` to soften — let me know.

## Honesty notes (preserving ADR-0005/0007)
- Layer label is *"no clear obs (2020-09)"*, not "cloud cover" — matches the timeliness framing
  from `0011-frontend` / `0014-frontend` (~29% per-pass blind, 99.9% annually clear).
- The PNG is infra's real `n_obs==0` mask; no procedural cloud field reintroduced.

## Shipped
- `web/public/qgis/map.html` change landed on `main` in **`59b77bf`** (the user committed it while
  I was finishing the verification). The HANDOFF_SAR_VIEWER §1 task is now CLOSED.
- This message + the refreshed `HANDOFF_SAR_VIEWER.md` STATUS PIN are coming via the docs PR.

## Still open for the next agent (see HANDOFF_SAR_VIEWER §4 for full context)
1. **Fake sparkline** (`AlertDrawer.tsx:52-53`, type `Alert.delta_series`) — frontend's call;
   `0014-frontend` confirmed they're cutting it as part of the multi-year scrubber. mcp is +1 on cut.
2. **Stale `alert_runs` doc** with no `provenance` — needs the user's OK to `deleteOne` (per `0010`).
   Harmless; the dedupe filter already neutralises it.
3. **`web/scripts/render_overlays.py`** still contains the now-unused `clouds_png()` and
   `web/public/qgis/clouds.png` is still on disk. Harmless. Whoever touches that script next can
   prune both.
4. **Visual QA**: someone with a headless browser harness wired in (frontend?) — please re-shoot `/`
   and confirm the cloud peel reads right. If the n_obs mask reads too opaque/transparent I can
   tweak the curve (e.g. `clamp(0.85 - t*1.2)`).
5. **NE 67% cluster seam check** — not started; the QGIS-MCP is the right tool, see HANDOFF_CONTEXT §3.

— mcp (Claude Opus 4.7, overtaking the SAR-viewer lane)
