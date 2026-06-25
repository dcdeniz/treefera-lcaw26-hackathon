# `mcp/` — QGIS-as-a-service → MCP → Mongo → REST

Stands up a **headless QGIS Desktop as an MCP server** (vendored `QgisStreamMCP`), drives the
Through-the-Clouds PALSAR change-detection pipeline through it from a **TypeScript MCP client**, and
ingests the resulting alerts into the existing **MongoDB `through_the_clouds`** database, exposed by a
thin **Express REST API** with geospatial (`2dsphere`) queries.

This implements the PR #4 handoff (`HANDOFF_QGIS_MCP.md`) — with two deliberate corrections to its
(pre-ADR, pre-Next.js) assumptions, documented under [ADRs](#adrs) below.

```
 TS MCP client (mcp/client)                QGIS-MCP container (vendored, :8100/mcp)
 ──────────────────────────                ──────────────────────────────────────
   npm run pipeline ──── execute_python ──▶  QGIS 3.44 + GDAL/numpy/scipy
        │                                       └─ execs /app/ttc-config/detect.py
        │                                          (faithful port of src/ — 54 alerts)
        │                                       writes /data/outputs/<run_id>/alerts_2023.geojson
        ▼                                                    │ (bind mount → mcp/outputs/)
   ingest ───────────────────────────────────────────────────┘
        ▼
   MongoDB  through_the_clouds
     ├─ alert_runs   (run registry; existing)
     └─ alerts       (per-feature, 2dsphere; NEW — INFRA_CONTRACT §2.3 Option B)
        ▲
   Express REST API (mcp/api, :4000)  GET /api/runs · /api/alerts?bbox= · /api/alerts/frontier
```

## Two-track design (why the demo can't break)

The `src/` Python pipeline already ships the live demo (`web/public/data/alerts.json` →
Next `/api/alerts` → the isometric scene). **This `mcp/` stack is the productization track**: an
agent-drivable geospatial engine + a queryable run/alert registry + a geospatial REST surface. It
**reuses** the same verified algorithm (`detect.py` is a byte-faithful port of `src/`, validated to
produce the identical 54 alerts) and the **same** `through_the_clouds` database. It does **not** touch
the Next.js static-first demo path — INFRA_CONTRACT §1.3 stays intact.

## Layout

| Path | What |
|---|---|
| `compose.yml` | Overrides the vendored image: mounts our catalog + recipes + `config/` + `../real-data` → `/data/inputs`, `./outputs` → `/data/outputs`. Builds `linux/amd64` (the vendor pins QGIS apt to amd64). |
| `config/detect.py` | **The pipeline.** Dual-backend (osgeo in-container / rasterio locally) faithful port of `src/`. Run `python config/detect.py` to validate against `outputs/alerts/`. |
| `config/thresholds.json` | Tunables mirrored from `src/config.py`. |
| `datasources.borneo.json` | Borneo catalog (replaces the vendor's French defaults). |
| `recipes/ttc_{detect_change,validate,full}.json` | Declarative recipes runnable via `run_recipe(id, zone=…)`. |
| `client/` | TS MCP client + Mongo ingester + CLI. |
| `api/` | Express REST API over `through_the_clouds`. |

## Run book

```bash
# 0. (one-time) clone the vendored MCP server (gitignored) + build the image
git clone --depth 1 https://github.com/nic01asFr/QgisStreamMCP.git vendor/qgis-stream-mcp
docker compose -f mcp/compose.yml up -d --build      # ~10 min first build (amd64 emulation)
curl http://localhost:18080/health                   # {"api":"ok","qgis":{...}}  · noVNC: http://localhost:6080

# 1. deps + db indexes (reuses web/.env.local for MONGODB_URI)
npm install --prefix mcp/client && npm install --prefix mcp/api
npm run init-db --prefix mcp/client

# 2. drive the pipeline over MCP (execute_python → detect.py → ingest)
npm run pipeline --prefix mcp/client
#   → { alertsInserted: 54, pipelinePassed: false, ... }

# 3. verify Mongo + serve the REST API
npm run verify --prefix mcp/client                   # 2dsphere $geoWithin == 54
npm start --prefix mcp/api                            # :4000
curl 'http://localhost:4000/api/alerts?bbox=113.4291,-1.0733,113.5709,-0.9266'   # 54 features
```

Other CLI commands: `npm run tools` (list the 40 QGIS-MCP tools), `npm run recipe --prefix mcp/client`
(the `run_recipe(id='ttc_full', zone=…)` showcase), `npm run ingest --prefix mcp/client` (ingest an
existing geojson, e.g. the committed `outputs/alerts/alerts_2023.geojson`).

## REST API

| Method · Route | Returns |
|---|---|
| `GET /api/health` | `{ ok, db: "up"\|"down" }` |
| `GET /api/aois` | AOI registry |
| `GET /api/runs[?aoi_id=]` | last 20 runs, newest-first |
| `GET /api/runs/:run_id` | one run |
| `GET /api/runs/:run_id/alerts` | the run's alerts as a GeoJSON FeatureCollection |
| `GET /api/alerts?bbox=lng,lat,lng,lat[&run_id=]` | `2dsphere $geoWithin` FeatureCollection |
| `GET /api/alerts/frontier[?run_id=]` | only `candidate_plantation_frontier === true` |

## ADRs (reconciliations vs the PR #4 handoff)

- **Reuse `through_the_clouds`, do NOT create a `ttc` db.** The handoff §7 proposed `ttc_runs` /
  `ttc_alerts`. The infra agent already seeded `through_the_clouds` with `aois` / `alert_runs` (conv
  0005). A second db would fragment the schema. We keep `alert_runs` as the registry and **add** a
  per-feature `alerts` collection (`2dsphere`) — exactly INFRA_CONTRACT §2.3 Option B.
- **No DN→dB calibration.** The handoff §6 recipe applies `10·log10(DN²)−83`. Our GEE PALSAR is already
  gamma0 dB (**ADR-0003**), so `detect.py` skips calibration — matching `src/`.
- **Drive `execute_python` directly for the parameterized run.** The vendor `run_recipe` only
  substitutes `$zone` (hardcoded `required: ["id","zone"]`), so it can't pass `run_id`/paths/thresholds.
  The CLI `pipeline` command builds the param dict in TS and calls `execute_python`; the `ttc_*` recipes
  are zone-only and write to the fixed `/data/outputs/recipe_run/` for the `run_recipe` showcase.
- **Algorithm fidelity by construction.** `config/detect.py` is a line-for-line port of
  `src/sar.py` + `src/detect_change.py` + `src/validate.py`. Locally (`rasterio` backend) and
  in-container (`gdal` backend) it produces the **identical** 54 alerts / 136.786 ha / UA 0.401 PA 0.301
  F1 0.344 — verified against the committed `outputs/alerts/`.
- **Honest gate.** `pipeline_passed = false` (F1 0.344 vs the §4.4 threshold 0.70). Hansen is optical /
  cloud-limited, so SAR-yes/Hansen-no is not auto-wrong (**ADR-0005**); object-precision vs Hansen is
  0.444. We ship caveated (**ADR-0007**), not inflated.

## Known vendor gaps (patched locally; `vendor/` is gitignored)

- `vendor/qgis-stream-mcp/setup_qgis_connections.py` is **missing upstream** but `COPY`'d by the
  Dockerfile and run by `entrypoint.sh`. We add a no-op stub (recipes load rasters by explicit path, not
  catalog connections), so the build is green.
- The vendor pins the QGIS apt repo to `arch=amd64`; on Apple Silicon the image builds/runs under
  `linux/amd64` emulation (`platform: linux/amd64` in `compose.yml`). Slow but works (QGIS 3.44 boots,
  `processing_available: true`).
- Host ports: the vendor exposes `8080`/`8081` which commonly collide locally — we remap REST to
  `:18080` and drop the unused MJPEG `:8081`.

## Acceptance criteria (handoff §10) — status

1. Container healthy — ✅ `:18080/health` `api:ok`, QGIS 3.44, noVNC `:6080`.
2. Pipeline runs, ≥20 features w/ the 5 props — ✅ **54** features via MCP `execute_python`.
3. Mongo ingest, valid GeoJSON Feature + run doc — ✅ 54 in `alerts` (2dsphere), 1 `alert_runs`.
4. REST `bbox` query returns a FeatureCollection — ✅ 54 via `$geoWithin`.
5. (stretch) wire the frontend MapView — ❌ intentionally skipped: the Next `/` already renders real
   alerts via the static-first path; pointing it at `:4000` would break the normalized isometric scene.
6. Idempotency — ✅ timestamped `run_id`; re-runs upsert the run and replace that run's features.
