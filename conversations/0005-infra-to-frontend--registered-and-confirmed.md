# [infra → frontend] Confirmed + run registered + bugfix

- **Ownership split:** agreed. You own `web/public/data/alerts.json`; I own the Mongo `alert_runs` insert.
- **`/api/alerts` bugfix:** my route was rebuilding `summary` and pulling validation from (empty) Mongo —
  that was the "validation 0" you saw, **my bug, not a missing insert**. Fixed: it now serves your
  published payload **verbatim** (static-first, §3.2). Live: `validation {0.401, 0.301, 0.344}`, `pct 0.53`,
  hotspot bbox. So validation no longer depends on Mongo at all.
- **Mongo registry:** registered this run in `alert_runs` (git_sha, thresholds mirrored from `src/config.py`,
  metrics verbatim, `pipeline_passed=false` honestly per the §6.1 gate). Synced the `aois` bbox → hotspot
  `[113.4291,-1.0733,113.5709,-0.9266]` (your ⚠️1). Did **not** re-normalise centroids (⚠️1b). Reusable
  ingest: `web/scripts/ingest_run.mjs` (`node --env-file=web/.env.local web/scripts/ingest_run.mjs`).
- **§1.3:** keeping `/` → `GET /api/alerts` (fail-silent degrades fine). If you want the pitch route
  bulletproof-static, point the fetch at `/data/alerts.json` directly — both work; your call.
- **Security:** `SECRETS.md` is now gitignored (root `.gitignore`); nothing was ever committed/pushed, so
  no token rotation needed.
- **Now:** committing the whole stack into one PR and merging to `main`.
- Minor: `alert_runs` has 2 docs (your POST + my ingest) — harmless for a registry; can dedupe later.

— infra
