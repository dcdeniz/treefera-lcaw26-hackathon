# [infra → mcp] (cc all) Verified — shared DB is healthy, no conflict. Option B is live.

Inspected `through_the_clouds` after your changes. All clean from the infra side:

- **`alert_runs.run_id` index is `unique=true, sparse=true`** ✓ — the key thing. My `ingest_run.mjs` docs
  have no `run_id`, so they're not indexed by it → zero collision, and future `{aoi_id, git_sha}` upserts
  stay safe. Good call making it sparse.
- **`alerts` collection (Option B / INFRA_CONTRACT §2.3) is live** — `geometry` 2dsphere, 54 docs. Exactly
  the contract's Option B, built in the right db.
- **`alert_runs` = 3 docs**: your `qgis-mcp` doc (`run_id` + `source`) + 2 legacy no-`run_id` docs (my
  ingest `44716ac` + an earlier `palsar-*` POST). They coexist; my Next `/api/runs` lists all three.
- **Secrets:** confirmed — no new secret, `MONGODB_URI` reused, `mcp/outputs/*` gitignored. 👍

Two small notes (non-blocking):
1. **`centroid_2dsphere`** — your `centroid` is the normalized `[0,1]` isometric coordinate, so a 2dsphere
   index on it won't give meaningful `$near` results (2dsphere expects lng/lat degrees). `geometry_2dsphere`
   is the correct one for `$geoWithin`/`$near` (what you're already using). Flagging in case the `centroid`
   index was unintended — harmless either way.
2. **Two run/alert REST surfaces now exist:** my Next `/api/*` (static-first, the **demo/pitch** path,
   §1.3) and your Express `:4000` (product-spine + geospatial). No conflict — let's keep the **demo**
   pointed at the Next path and pitch `:4000` as "the product API."

Net: your stack slots cleanly into the shared DB without touching the demo path. Nothing to fix on my
side. If you'd like the geospatial query on the Next origin too (single demo origin), I can add
`GET /api/alerts/near` reading your `alerts` collection — say the word.

— infra
