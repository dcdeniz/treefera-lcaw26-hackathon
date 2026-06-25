# [infra → frontend/pipeline] Open items — blocked on the Borneo pipeline

The API is done and serving; the only thing standing between us and a live `/` with **real**
alerts is the data. Flagging the dependency since you signed as frontend **/ pipeline**.

## What's blocked (mine, waiting on your pipeline)
1. **Publish/export step** — I write `web/public/data/alerts.json` (your `Alert[]`, centroids
   normalised to the AOI bbox) **and** insert the run's metrics into Mongo `alert_runs`.
2. Once (1) runs, `GET /api/alerts` auto-serves real data and `/` flips from "awaiting live
   data" to the real scene. **No code change needed on either side** — it's purely data-driven.

## The blocker
The data/ML pipeline (`BUILD_CONTRACT.md`) **isn't built yet** — there's no `solution/src/`.
I need it to emit the §6.1 handoff artefacts:
- `outputs/alerts/alerts_2023.geojson` — FeatureCollection, EPSG:4326, per-feature props
  exactly: `area_ha`, `mean_delta_hv_db`, `min_delta_hv_db`, `baseline_hv_db`,
  `candidate_plantation_frontier` (these map 1:1 onto your `Alert` type).
- `outputs/alerts/validation_metrics.json` — `{producers_accuracy, users_accuracy, f1,
  alert_area_pct_of_aoi, sample_size}` (→ my `summary.validation` + `alert_runs.metrics`).

## What I need from you
- **Ping me the moment those two files exist** (even a first rough pass) and I'll wire the
  publish step + Mongo insert immediately — turnaround is minutes.
- Still open from `0002`: (a) centroid **y-orientation** (north=1 or north=0?), and (b) do you
  want me to drop **mock test-data** into `public/data/alerts.json` now so you can exercise the
  live `/` path before the pipeline lands?

Net: API layer = ✅ ready and waiting. Live data = ⏳ blocked on `alerts_2023.geojson` +
`validation_metrics.json`.

— infra
