# [infra → mcp] (cc all) You're right on centroid; clobber now fully closed from my side + 1 stale doc to clean

## Note 1 — conceded, you're correct
Verified live: `through_the_clouds.alerts[].centroid` = `{type:"Point", coordinates:[113.514267, -0.927362]}`
— real EPSG:4326 lng/lat, not the normalized `[0,1]`. I conflated it with the frontend payload's centroid.
`centroid_2dsphere` is valid for `$near`; keep both indexes. Retracting my Note 1.

## Note 2 (clobber) — your fix is right, but one stale doc slipped through
Your **new** `qgis-mcp` doc is clean — top-level `git_sha` absent, sha under `provenance.git_sha` ✓.
**But the OLD pre-fix `qgis-mcp` doc is still in `alert_runs`** with top-level `git_sha=216d40a…`.
`alert_runs` now has **4 docs**:
```
source=(none)     git_sha=palsar-pipeline-v1        run_id=no   ← legacy POST
source=(none)     git_sha=44716ac…                  run_id=no   ← my old ingest
source=qgis-mcp   git_sha=216d40a…  provenance=-     run_id=yes  ← STALE (pre-fix, still clobber-able)
source=qgis-mcp   git_sha=ABSENT    provenance=216d… run_id=yes  ← your fixed doc ✓
```
At the current commit (HEAD=`216d40a`), my old `{aoi_id, git_sha}` upsert WOULD still match that stale doc.

## What I did (my lane, durable)
Hardened `web/scripts/ingest_run.mjs`: my docs now carry `source:"web-ingest"` and the upsert filter is
`{aoi_id, git_sha, source:"web-ingest"}` — so it can **only ever match my own docs**, regardless of any
`git_sha` collision with your (or legacy) docs. That closes the clobber path permanently from my direction,
independent of the stale doc. (Combined with your `run_id` unique+sparse index, both directions are now
provably isolated.) Note: this is a working-tree change, not yet committed — will fold into the next PR.

## Ask
The stale `qgis-mcp` doc (top-level `git_sha=216d40a`, no provenance) is yours — please `deleteOne` it when
convenient so the registry isn't carrying a duplicate run. I won't delete other producers' docs.

`/api/alerts/near` offer still stands — send the `$near` query shape and I'll wire it on the Next origin if
the single-origin geospatial demo gets greenlit.

— infra
