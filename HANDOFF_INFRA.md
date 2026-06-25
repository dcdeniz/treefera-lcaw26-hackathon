# Handoff — Infra / Mongo / SaaS workstream

Pick-up doc for the next **infra/backend/SaaS** agent (governed by `INFRA_CONTRACT.md`). Written
2026-06-25. Sibling workstreams: **frontend/pipeline** (the `web/` UI + the `src/` PALSAR detector) and
**mcp** (the QGIS-MCP→Mongo→Express stack under `mcp/`). Coordinate via `conversations/` (see §8).

> Project: Treefera LCAW26 hackathon, Theme G "SAR through clouds". Detect 2022→2023 forest clearing in
> cloudy Central Kalimantan from L-band PALSAR HV, expose it on a web map. Demo = static-first; Mongo is
> the productization spine, **never** in the demo's critical path (INFRA_CONTRACT §1.3 — load-bearing).

---

## 1. Repo / branch state (as of writing)
- `origin/main` @ `8403ba5` "Add QR code image". **Local main may be 1+ behind — `git fetch && git checkout main && git merge --ff-only origin/main` first.**
- Merged infra PRs: **#3** (Mongo API layer + registry), **#8** (ingest hardening + channel log + gitignore). Also merged: #2 (frontend), #4 (QGIS-MCP handoff doc), #7 (mcp QGIS stack + SAR viewer).
- ⚠️ **Shared working tree, multiple agents committing to `main` concurrently.** `main` moves every few minutes. See §8 for the merge-race playbook. **Never `git add -A`** — stage explicit paths only, or you'll sweep other agents' in-progress files and cause conflicts.

## 2. What's DONE ✅
- **MongoDB Atlas** seeded + healthy. DB `through_the_clouds`. Collections: `aois` (1), `alert_runs` (4 — see §4 caveat), `alerts` (108, Option-B per-feature 2dsphere — built by mcp), `tuning_log`.
- **API layer** (`web/src/app/api/`): `GET /api/alerts` (static-first, serves the pipeline payload verbatim), `GET/POST /api/runs` (registry; POST is `INGEST_TOKEN`-gated), `GET /api/health`.
- **`web/src/lib/mongo.ts`** — cached, fail-silent client (DB down → null → demo still renders).
- **`web/src/lib/alerts.ts`** — `getAlertsPayload()`: reads `web/public/data/alerts.json` verbatim, empty fallback.
- **`web/scripts/ingest_run.mjs`** — registers a run into `alert_runs`, scoped `source:"web-ingest"` so its upsert can't clobber other producers' docs (conv 0009/0010).
- **`.gitignore`** — anchored `/data` `/real-data` so `web/public/data` ships (§4.1); secrets + build noise ignored.
- **Pipeline ran** (frontend/pipeline's `src/`): 54 alerts, F1 0.344, `pipeline_passed=false` (honest, below gate — ADR-0005/0007; ship caveated).
- **S2 cube cracked + characterized** (see §6) → delivered `web/public/qgis/optical_real.png`.

## 3. The one real gap 🔴 — Vercel deploy (needs human / Vercel auth)
**There is no live URL yet.** INFRA_CONTRACT §7.1–3,5 not done:
1. Create Vercel project, **Root Directory = `web/`** (Next 15), Node 20.
2. Env vars in Vercel (Production + Preview): `MONGODB_URI`, `INGEST_TOKEN` (values in `SECRETS.md` / `web/.env.local`).
3. Deploy → get the public URL → generate QR from the final URL (a `QR code image` commit `8403ba5` exists — check whether a deploy already happened).
4. Verify §1.3 on the live URL: map + alerts + stats render with the static path; the demo must not hard-depend on `/api`.
- Project-create/link is account-gated → **needs the human's Vercel login** (or they run `vercel` and you drive config). You can prep everything else: `vercel.json`, env doc, a clean production build check.

## 4. Mongo specifics (your lane)
- Cluster `treefera-lcaw-2026-dd-s.5u8vzog.mongodb.net`, user `denizdogan1101_db_user`. **Secrets in `SECRETS.md` (repo root, gitignored) + `web/.env.local` (gitignored).** Do NOT commit them. `mongosh` works locally.
- `aois._id="G_sar_borneo"`, bbox = hotspot `[113.4291,-1.0733,113.5709,-0.9266]`.
- `alert_runs` indexes: `{aoi_id,created_at:-1}`, `{git_sha}`, `{run_id}` **unique+sparse**. Two producers coexist safely: web ingest keys `{aoi_id,git_sha,source:"web-ingest"}`; mcp keys `run_id` + `provenance.git_sha`.
- ⚠️ **Registry drift:** `alert_runs` has 4 docs incl. 1 **stale** qgis-mcp doc with a top-level `git_sha=216d40a` (pre-fix). Harmless (the source-scoped upsert can't touch it) but cosmetically duplicate. Cleanup needs careful single-doc deletes **with human ok** (the auto-classifier blocks broad `deleteMany` on the shared DB — correctly). Don't delete other producers' docs unilaterally.

## 5. Static-first contract (don't break)
- Demo data: `web/public/data/alerts.json` (`AlertsPayload`, written by `src/export_payload.py` — **frontend/pipeline owns this file**). `/api/alerts` serves it verbatim; `web/src/components/scene/LiveScene.tsx` fetches `/api/alerts`; `ThroughTheClouds` (live) renders the `/qgis/map.html` iframe for the map + `summary` into `BottomStats`.
- The qgis viewer (`web/public/qgis/`, mcp's) is self-contained static (its own PNGs + `overlays_manifest.json`) — no `/api`, no `:4000`. Good for §1.3.
- Types contract: `web/src/lib/types.ts` (`AlertsPayload`/`Alert`/`Summary`/`Aoi`). AOI: `web/src/lib/aoi.ts`.

## 6. Sentinel-2 cube (for the optical layer)
- `real-data/sentinel2/sentinel2_G_sar_borneo.zip` — **zarr v3**, group `sentinel2/G_sar_borneo/2017-01-01_2025-12-31/cube.zarr`, EPSG:32749, 108 **monthly** steps 2017-2025, bands B02–B12 + `n_obs`, uint16 DN.
- **Incantation** (the `GroupNotFoundError` fix was the nested `group=`):
  ```python
  import zarr, xarray as xr, rioxarray  # noqa
  store = zarr.storage.ZipStore("real-data/sentinel2/sentinel2_G_sar_borneo.zip", mode="r")
  ds = xr.open_zarr(store, group="sentinel2/G_sar_borneo/2017-01-01_2025-12-31/cube.zarr",
                    consolidated=False, chunks={})
  # reflectance=(DN-offset)/10000; offset=1000 for time>=2022-01-25 (PB04.00); DN==0/n_obs==0=nodata
  ```
- **Key constraint:** `composite: monthly_median`, SCL clouds masked **before** median, **no SCL band**. So the cube holds **no single-date frames** and **no 40–60% cloud scene** (cloudiest monthly composite ≈14% residual). A real cloudy single-date + separable mask needs a raw **S2 L2A** granule (external pull) — not in this bundle. (Full reasoning: `conversations/0012-infra`, `0013-infra`.)

## 7. ⏳ IN PROGRESS — where I left off (optical blind-spot layer)
mcp (conv `0013-mcp-to-infra`) wants an **honest cloud-blind-spot layer = `n_obs==0`** (pixels with zero clear optical obs that month), dropped at `web/public/qgis/cloud_nobs.png`, same bounds as `optical_real.png`.

- I rendered `optical_real.png` (real true-colour, month **2020-09**, bounds `west 113.429105, south -1.073316, east 113.570921, north -0.926635`). mcp wired it + dropped procedural clouds. ✅
- I rendered `cloud_nobs.png` for 2020-09 too — **but 2020-09 is anomalously clear (n_obs==0 ≈ 0.1% of AOI)**, so that blind-spot layer is essentially empty → no story.
- **NEXT STEP (do this):** pick a *typical cloudy* 2023 month (frontend's stat: median ≈29% obscured; aim ~30–45% `n_obs==0` so ground is still visible) and **re-render BOTH** `optical_real.png` *and* `cloud_nobs.png` for that **same** month so they register and the "optical was blind here / SAR saw it" story is real. Overwrite the files (mcp's wiring points at the same paths) and tell mcp the month you chose (reply in `conversations/`). Keep bounds identical.
- Scratchpad scripts to adapt (session-local, may not persist): `render_optical.py`, `render_nobs.py`, `scan_clouds.py`. To find the month, scan `(ds["n_obs"].sel(time=slice("2023-01-01","2023-12-31"))==0).mean(("y","x"))` and pick ~0.30–0.45.
- This is frontend/pipeline-adjacent polish, not core infra — fine to hand back to them if you'd rather focus on the deploy.

## 8. Multi-agent coordination
- Channel: `conversations/` — **one file per message, append-only, `NNNN-<from>-to-<to>--<slug>.md`**, never edit another agent's file. `conversations/README.md` has the protocol. Read newest first; latest infra↔mcp↔frontend thread is the optical layer (0011–0013).
- I had been polling the channel with a background `bash` loop (`while …; ls; sleep 20`) that re-invokes on change. Re-arm one if you want hands-off pickup; otherwise just read the folder.
- **Merge-race playbook** (main moves under you): branch from latest `origin/main`; stage **explicit paths only**; `gh pr create` then `gh pr merge <n> --squash --delete-branch`. If "not mergeable", `git fetch && git merge origin/main`, resolve (usually just `.gitignore` unions), push, retry. GitHub mergeability lags — a "not mergeable" can clear on retry once your branch contains `origin/main`.

## 9. Commands
```bash
# pipeline (writes outputs/alerts/* + web/public/data/alerts.json)
hackathon-demo/.venv/bin/python -m src.run
# register a run into Mongo alert_runs
node --env-file=web/.env.local web/scripts/ingest_run.mjs
# mongosh
mongosh "$(grep MONGODB_URI web/.env.local | cut -d'"' -f2)" --apiVersion 1 --quiet
# web dev (loads .env.local) + smoke the API
cd web && npm run dev   # then: curl localhost:3000/api/{health,alerts,runs}
# render optical/n_obs (S2 cube) — use the hackathon venv (xarray 2026.4 / zarr 3.2)
hackathon-demo/.venv/bin/python <your-render-script>.py
```

## 10. Landmines
- **Never `git add -A`** (shared tree). **Never commit `SECRETS.md`/`.env.local`** (gitignored — keep it that way).
- Keep Mongo out of the demo critical path (§1.3). `/api/*` must fail-silent.
- `solution/` (RandomForest study) and `solution/webapp` (gutted stub) are **NOT** the live system — the live pipeline is `src/`, the live app is `web/`. Ignore `solution/`.
- Don't re-seed Mongo or rebuild the API as separate Vercel functions — it's co-located Next route handlers in `web/`, settled.
- See also: `INFRA_CONTRACT.md` (full spec), and the private memory `infra-mongo-state.md`.
