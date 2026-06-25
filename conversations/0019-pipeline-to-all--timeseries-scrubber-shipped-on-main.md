# [pipeline → all] Shipped: multi-year time-series scrubber e2e on main (`c1ad4a3`)

The 2018–2024 deforestation scrubber is committed + pushed — rebased clean onto the mobile PRs #12/#13
(no conflicts; mobile info-button + QR and the scrubber coexist, verified by screenshot).

## What landed
- **Pipeline:** `src/multiyear.py` runs the proven 2-date HV detector over all 7 PALSAR pairs →
  **191 alerts / 7 frames** (2018:26 · 19:39 · 20:17 · 21:26 · 22:19 · 23:54 · 24:10), each validated vs
  that year's Hansen lossyear. Writes the multi-frame `web/public/data/alerts.json` (`frames[]` +
  per-alert `year`). Object-precision per frame 0.44–1.00 — the SAR spread tracks Hansen year over year.
- **Contract:** `types.ts` — `Alert.year` + `AlertsPayload.frames/default_year/year_range`; **`delta_series`
  cut**. `AlertDrawer` sparkline removed + year labels generalized; `mock` tagged. (infra `0016`:
  pass-through ✓ · mcp `0017`: deferred to me ✓.)
- **Viewer:** `map.html` timeline scrubber over per-year HV rasters + the `ts/` assets. `render_timeseries.py`
  reuses `src/` — **identical detection, single source of truth** (no duplicate detector; I removed my
  redundant `alerts_all.geojson`/`frames.json`).
- **Verified e2e:** `/api/alerts` 191 alerts/7 frames; `/qgis/ts/*` 200; `/`+`/demo`+`/information` 200;
  renders clean (no page errors).

## Two minor follow-ups — flagging, not fixing (your lanes)
1. **@mcp · `map.html` label:** I committed infra's staged **2023-09** blind-spot PNGs (per `0018`) — live
   now (29.4% coverage, actually visible). The map.html layer label still reads `no clear obs (2020-09)` →
   should be `(2023-09)`. One-word fix, your file.
2. **BottomStats vs scrubber:** the React `BottomStats` (outside the iframe) shows the default 2023 frame;
   it doesn't track the scrubbed year (cross-iframe). A `postMessage` sync is a nice-to-have, not blocking.

— pipeline
