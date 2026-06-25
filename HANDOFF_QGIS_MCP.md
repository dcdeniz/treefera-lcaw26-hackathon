# Handoff — QGIS MCP server → TS/JS client → file artifacts → MongoDB

> **Read me first.** This is a one-shot brief for the next dev's agent.
> All context, ADRs, contracts, and acceptance criteria are below — you should not need to read prior conversation history. Inputs to leave alone are listed in §14.

---

## 0. The mission in one paragraph

Stand up a headless QGIS-as-a-service via MCP, drive the **BUILD_CONTRACT.md** pipeline (PALSAR L-band → speckle filter → Δ HV detection → polygonize → validate) through it from a TypeScript client, dump the outputs as files (GeoJSON, GeoTIFF/COG, PDF), and ingest them into MongoDB so the existing React frontend at `web/` can render real alerts instead of mock data. Budget: ~1 working day for end-to-end demo. **You are strictly backend / MCP / data layer — do not touch `web/` source unless step §10.5 (wire MapView) is in scope.**

## 1. Project context (so you don't need prior history)

- Repo: `treefera-lcaw26-hackathon` (current branch is whatever you check out — frontend work merged via PR #1 onto `main`, USP work on `usp-branch`).
- Product wedge: **Cloud + canopy-penetrating L-band SAR deforestation alerts for Borneo**. Differentiator vs. RADD (Sentinel-1 C-band) is that L-band sees through dense canopy too.
- Pipeline spec (authoritative): [`BUILD_CONTRACT.md`](./BUILD_CONTRACT.md). 11 numbered steps, 6 agents (A Data Prep → F Orchestrator). The validation gate (§4.4) is the demo pass/fail.
- Commercial wedge: [`USP_AND_BORNEO_PILOT_TARGETS.md`](./USP_AND_BORNEO_PILOT_TARGETS.md). 10 named pilot targets in Borneo.
- Frontend: `web/` is a Vite + React 19 + jedorini/neat component lib app. Renders an isometric "peel-through-cloud" hero, alert drawer, agent/pipeline strips. Currently reads from `web/src/data/mock.ts`. The acceptance for this handoff stops at *making real Mongo-backed data available at a REST endpoint*; wiring the map view is a stretch goal.

## 2. What's already done for you on this branch

- **`vendor/qgis-stream-mcp/`** — full clone of [nic01asFr/QgisStreamMCP](https://github.com/nic01asFr/QgisStreamMCP). Read-only reference. **Do not edit in place** — we'll mount overrides, not fork.
- **`vendor/qgis-mcp-jjsantos/`** — clone of [jjsantos01/qgis_mcp](https://github.com/jjsantos01/qgis_mcp). Lighter alternative; keep as fallback only.
- `vendor/` is gitignored. Re-clone if missing:
  ```bash
  git clone --depth 1 https://github.com/nic01asFr/QgisStreamMCP.git vendor/qgis-stream-mcp
  git clone --depth 1 https://github.com/jjsantos01/qgis_mcp.git vendor/qgis-mcp-jjsantos
  ```
- **`neat-out/graph.json`** — repo dependency graph emitted by `npx neat.is init .`. Watch with `npx neat.is watch .` if you want live extraction while you work.
- **`web/`** — frontend, already built. You will not modify it unless §10.5 is in scope.

## 3. Code design study — why QgisStreamMCP wins

### 3.1 Architecture (as cloned)

```
┌─────────────────────────────────────────────────────────────┐
│  Docker container (single image, ~3.5 GB)                  │
│                                                            │
│   QGIS Desktop  ◄── Xvfb (virtual X11)                     │
│       │                                                     │
│       │  PyQGIS via UNIX socket /tmp/qgis_bridge.sock      │
│       ▼                                                     │
│   qgis_bridge.py  (5,370 LOC)                               │
│       │                                                     │
│       ├─► main_mcp.py     :8100  MCP Streamable HTTP        │
│       ├─► api_server.py   :8080  REST + /health             │
│       ├─► stream_server.py :8081 MJPEG                      │
│       └─► noVNC           :6080  Browser GUI                │
│                                                             │
│   Mounts: ./data → /data  (your input rasters live here)   │
│           ./recipes → /app/recipes   (drop your JSON here)  │
│           ./datasources.json → /app/datasources.json        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 What we keep

- The whole **Docker model** — headless QGIS + Xvfb + ~1000 Processing algorithms. The hard parts are already solved.
- **MCP Streamable HTTP on `:8100`** — works with the official `@modelcontextprotocol/sdk` Node client.
- The **Smart Loading** pattern (`set_study_zone` → `smart_load` → cached GPKG with R-tree). Replaces flaky live WFS with fast local files; perfect for our static PALSAR mosaics.
- The **Recipe abstraction** (`recipes/*.json` — parameterised multi-step workflows). One JSON file per BUILD_CONTRACT pipeline run.
- **Export tools** — `export_layer` (GeoJSON, GPKG, SHP, CSV), `export_pdf`, `export_web_map` (Leaflet HTML), `get_features` (pull GeoJSON back over the wire).

### 3.3 What we replace

- **`datasources.json`** — currently French (BD TOPO, IGN orthos, RPG). We add a Borneo catalog as `mcp/datasources.borneo.json` and mount it into the container.
- **`recipes/`** — currently French city use cases (densité bâti, risque inondation). We add `ttc_*` namespaced recipes mirroring BUILD_CONTRACT §3.4–§3.10.

### 3.4 What we add

- A **TypeScript MCP client** in `mcp/client/` that orchestrates the recipe run and pulls GeoJSON results back.
- A **MongoDB ingester** (same package) that writes alerts as GeoJSON Features with a 2dsphere index, plus a per-run document.
- A **thin REST API** in `mcp/api/` (Express, ~80 LOC) that exposes `/api/runs`, `/api/runs/:id/alerts`, `/api/alerts?bbox=…`. The frontend reads from here.

### 3.5 Why not jjsantos01/qgis_mcp

It's a QGIS Desktop *plugin* requiring a running GUI; great for interactive use, wrong for a pipeline service. QgisStreamMCP gives us the same surface plus the Docker + REST + recipe layer for free.

## 4. ADRs

| # | Decision | Why |
|---|----------|-----|
| **001** | Use QgisStreamMCP over jjsantos01 | Headless Docker; no QGIS Desktop required; REST + MCP in one image. |
| **002** | Wrap, do not fork. Keep `vendor/qgis-stream-mcp/` pristine. | Easy upstream pulls; our customisations live in `mcp/` and mount over the defaults. |
| **003** | MCP transport = Streamable HTTP (`:8100`), NOT stdio | Container is a long-lived service; multiple clients can connect; deployable to cloud. |
| **004** | TS client uses `@modelcontextprotocol/sdk` (Node, v0.6+) | Official, types included, streamable-HTTP transport supported. |
| **005** | File outputs land in `/data/` inside container, bound to `./data/mcp-outputs/` on host | Single mount point; ingester reads from the host path; container stays stateless. |
| **006** | MongoDB stores alerts as native GeoJSON Features with `geometry` as `Polygon` in EPSG:4326, ≥ 6 decimal places (EUDR-shape) | Mongo `2dsphere` index supports `$geoWithin`, `$geoIntersects` natively; frontend can consume as-is. |
| **007** | Raster + PDF artifacts go to S3-compatible bucket (MinIO locally) | Avoid bloating Mongo; GeoJSON-only docs stay small and queryable. For v0 demo, GridFS is acceptable. |
| **008** | Recipes namespaced `ttc_*` (Through-the-Clouds) | Won't collide with vendor recipes when both directories mount into `/app/recipes/`. |
| **009** | Validation gate (§4.4 of BUILD_CONTRACT) computed in ingester at write-time, attached to run document | Single source of truth for `pass`/`fail`; frontend just reads the boolean. |
| **010** | Idempotency = each run writes to a timestamped subfolder `data/mcp-outputs/<run_id>/`; Mongo run docs keyed by `run_id` | No accidental overwrite of historical runs; matches the decision raised in BUILD_CONTRACT §8 item 4. |
| **011** | No GPU. Render on CPU (Xvfb + Mesa/llvmpipe) per the docker-compose comment | PALSAR processing is CPU-bound anyway; GPU adds deploy complexity for no gain at hackathon scale. |
| **012** | Container = local dev only. For prod: same image on a Fly.io or Hetzner VM, behind Caddy | Out of scope for this handoff; document the seam. |

## 5. MCP tool contract — the subset we depend on

These already exist in QgisStreamMCP. We just call them.

| Tool | Purpose in our flow | Called by |
|---|---|---|
| `set_study_zone(target)` | Define Borneo AOI bbox; geocodes a name OR accepts `bbox=[lng_min, lat_min, lng_max, lat_max]` | Recipe step 0 |
| `add_layer(uri, name, type)` | Add a local PALSAR GeoTIFF or COG by path | Recipe steps 1, 2 |
| `execute_python(code)` | Run PyQGIS for calibrate / filter / Δ HV / mask / polygonize | Recipe steps 3–7 |
| `run_processing(alg_id, params)` | Call any of the 1000+ algorithms (e.g. `native:polygonize`, `gdal:warpreproject`) | Inside recipe |
| `export_layer(layer, format, path)` | Write `alerts_2023.geojson` to `/data/<run_id>/` | Recipe last step |
| `export_pdf(layout, path)` | Reviewer-grade PDF (optional, nice-to-have) | Recipe last step |
| `get_features(layer, limit?, bbox?)` | Pull GeoJSON back over the wire (alt to `export_layer` + file read) | Ingester |
| `get_screenshot()` | Sanity-check PNG of the canvas after detect | Debugging only |

**Do not** wire interactive tools (`mouse_click`, `qgis_desktop_ui`, `key_press`) — those are for human-driven workflows.

## 6. The `ttc_detect_change` recipe (full JSON to drop into `mcp/recipes/`)

This mirrors BUILD_CONTRACT §3.4–§3.10. PyQGIS in each step is illustrative — the real numeric constants come from `mcp/config/thresholds.json` (see §10 file layout). Substitute `$param` works as in vendor recipes.

```json
{
  "id": "ttc_detect_change",
  "name": "Through the Clouds — annual HV change detection",
  "description": "Borneo PALSAR L-band Δ HV deforestation alerts for one year pair. Implements BUILD_CONTRACT §3.4–§3.10.",
  "tags": ["sar", "deforestation", "borneo", "palsar", "ttc"],
  "parameters": {
    "aoi_name":   {"type": "string",  "required": true, "description": "e.g. g_sar_borneo"},
    "bbox":       {"type": "array",   "required": true, "description": "[lng_min, lat_min, lng_max, lat_max] EPSG:4326"},
    "year_a":     {"type": "number",  "required": true, "default": 2022},
    "year_b":     {"type": "number",  "required": true, "default": 2023},
    "palsar_a_path": {"type": "string", "required": true, "description": "container path to PALSAR year A GeoTIFF"},
    "palsar_b_path": {"type": "string", "required": true, "description": "container path to PALSAR year B GeoTIFF"},
    "hv_loss_db_threshold": {"type": "number", "default": -2.0},
    "water_db_threshold":   {"type": "number", "default": -24.0},
    "nonforest_db_threshold": {"type": "number", "default": -14.0},
    "mmu_ha": {"type": "number", "default": 0.2},
    "run_id": {"type": "string", "required": true, "description": "timestamped subfolder under /data/"}
  },
  "steps": [
    {
      "id": "zone",
      "tool": "set_study_zone",
      "params": {"bbox": "$bbox", "name": "$aoi_name"},
      "description": "Set AOI from bbox; project canvas zooms there."
    },
    {
      "id": "load_a",
      "tool": "add_layer",
      "params": {"uri": "$palsar_a_path", "name": "palsar_hv_$year_a_dn", "type": "raster"}
    },
    {
      "id": "load_b",
      "tool": "add_layer",
      "params": {"uri": "$palsar_b_path", "name": "palsar_hv_$year_b_dn", "type": "raster"}
    },
    {
      "id": "calibrate_a",
      "tool": "execute_python",
      "description": "DN → gamma0 dB; gamma0 = 10*log10(DN^2) - 83.0, drop DN=0.",
      "code": "from qgis.analysis import QgsRasterCalculator, QgsRasterCalculatorEntry\nimport processing\nlayer = project.mapLayersByName('palsar_hv_$year_a_dn')[0]\nout = f'/data/$run_id/hv_$year_a_db.tif'\nimport os; os.makedirs(os.path.dirname(out), exist_ok=True)\nformula = '10 * log10((\"palsar@1\" ^ 2)) - 83.0'\nentry = QgsRasterCalculatorEntry()\nentry.ref = 'palsar@1'; entry.raster = layer; entry.bandNumber = 1\ncalc = QgsRasterCalculator(formula, out, 'GTiff', layer.extent(), layer.width(), layer.height(), [entry], QgsCoordinateTransformContext())\nrc = calc.processCalculation()\nresult['out'] = out; result['rc'] = rc"
    },
    {
      "id": "calibrate_b",
      "tool": "execute_python",
      "description": "Same calibration on year B raster.",
      "code": "# … identical to calibrate_a with $year_b …"
    },
    {
      "id": "speckle_filter",
      "tool": "execute_python",
      "description": "Quegan–Yu multitemporal 5×5 + Lee 7×7. Use grass7:i.rgb.his or roll a numpy version via gdal_array.",
      "code": "# Implement as PyQGIS + numpy. Cite Quegan & Yu 2001, Lee 1981, Doblas 2022."
    },
    {
      "id": "delta_and_mask",
      "tool": "execute_python",
      "description": "delta_hv = hv_b - hv_a; alert where delta <= threshold AND not water AND not non-forest.",
      "code": "# raster calc: (hv_b - hv_a <= $hv_loss_db_threshold) AND (hv_a > $water_db_threshold) AND (hv_a >= $nonforest_db_threshold)\n# write /data/$run_id/hv_loss_raw.tif"
    },
    {
      "id": "clean",
      "tool": "execute_python",
      "description": "open 3×3, close 3×3, drop components < MMU.",
      "code": "# scipy.ndimage.binary_opening / closing; skimage.measure.label; filter by area; write /data/$run_id/alerts_2023_mask.tif"
    },
    {
      "id": "polygonize",
      "tool": "run_processing",
      "params": {"alg_id": "gdal:polygonize", "INPUT": "/data/$run_id/alerts_2023_mask.tif", "BAND": 1, "FIELD": "value", "OUTPUT": "/data/$run_id/alerts_2023_raw.gpkg"}
    },
    {
      "id": "compute_attrs",
      "tool": "execute_python",
      "description": "Compute area_ha, mean_delta_hv_db, min_delta_hv_db, baseline_hv_db, candidate_plantation_frontier.",
      "code": "# Per BUILD_CONTRACT §3.10: candidate_plantation_frontier = (area_ha >= 1.0) AND (mean_delta_hv_db <= -3.0)"
    },
    {
      "id": "export_geojson",
      "tool": "export_layer",
      "params": {"layer": "alerts_2023", "format": "geojson", "path": "/data/$run_id/alerts_2023.geojson"}
    },
    {
      "id": "export_gpkg",
      "tool": "export_layer",
      "params": {"layer": "alerts_2023", "format": "gpkg", "path": "/data/$run_id/alerts_2023.gpkg"}
    }
  ]
}
```

### Companion recipe: `ttc_validate.json`

Loads alerts + Hansen GFC + RADD (if cached locally), runs stratified random sampling per BUILD_CONTRACT §5, writes `validation_metrics.json` with UA, PA, F1, alert_area_pct. Same JSON shape. Leave the cross-check against the SPOT-7 scene as a `result['needs_human_review'] = true` flag if you can't automate the visual check in time.

### Top-level recipe: `ttc_full.json`

Calls `ttc_detect_change` then `ttc_validate` in sequence. The TS client only ever calls this.

## 7. MongoDB schema

Two collections. Pin to Mongo 6.0+ (any Atlas tier or a local Mongo).

### 7.1 `ttc_runs`

```json
{
  "_id": "ObjectId",
  "run_id": "2026-06-25T11:30:00Z__g_sar_borneo__2022_2023",
  "aoi_name": "Central Kalimantan SAR-through-clouds hotspot",
  "aoi_bbox": [113.25, -1.25, 113.75, -0.75],
  "year_a": 2022,
  "year_b": 2023,
  "started_at": "ISODate",
  "finished_at": "ISODate",
  "status": "success",
  "alerts_count": 142,
  "total_alert_area_ha": 318.6,
  "alert_area_pct_of_aoi": 1.4,
  "validation": {
    "users_accuracy": 0.81,
    "producers_accuracy": 0.72,
    "f1": 0.76,
    "alert_area_pct_of_aoi": 1.4,
    "pass": true
  },
  "thresholds": {
    "hv_loss_db": -2.0,
    "water_db": -24.0,
    "nonforest_db": -14.0,
    "mmu_ha": 0.2
  },
  "artifacts": {
    "alerts_geojson_url": "s3://ttc/2026-06-25.../alerts_2023.geojson",
    "alerts_gpkg_url":    "s3://ttc/2026-06-25.../alerts_2023.gpkg",
    "sar_2022_cog_url":   "s3://ttc/2026-06-25.../hv_2022_db.tif",
    "sar_2023_cog_url":   "s3://ttc/2026-06-25.../hv_2023_db.tif",
    "pdf_url":            "s3://ttc/2026-06-25.../report.pdf"
  }
}
```

Indexes:
```js
db.ttc_runs.createIndex({ run_id: 1 }, { unique: true })
db.ttc_runs.createIndex({ aoi_name: 1, started_at: -1 })
```

### 7.2 `ttc_alerts` (one document per polygon)

```json
{
  "_id": "ObjectId",
  "run_id": "2026-06-25T11:30:00Z__g_sar_borneo__2022_2023",
  "feature_id": "a_0001",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[113.412345, -1.027654], [113.413210, -1.027654], ...]]
  },
  "centroid": { "type": "Point", "coordinates": [113.412777, -1.027980] },
  "properties": {
    "area_ha": 4.2,
    "mean_delta_hv_db": -4.1,
    "min_delta_hv_db": -6.8,
    "baseline_hv_db": -11.2,
    "candidate_plantation_frontier": true,
    "cross_checks": {
      "hansen_gfc_2023": true,
      "radd_2023": true,
      "spot_visual": "forest"
    }
  }
}
```

Indexes (critical):
```js
db.ttc_alerts.createIndex({ geometry: "2dsphere" })
db.ttc_alerts.createIndex({ centroid: "2dsphere" })
db.ttc_alerts.createIndex({ run_id: 1, "properties.candidate_plantation_frontier": 1 })
```

EUDR-shape rules to enforce in the ingester:
- `geometry.type === "Polygon"`
- CRS EPSG:4326
- All coordinates ≥ 6 decimal places
- Polygon closed (first vertex == last vertex)
- Polygon area ≥ 0.0001 km² (1 dm²) to avoid degenerate features

## 8. TypeScript client interface

Use `@modelcontextprotocol/sdk` v0.6+. Skeleton (`mcp/client/src/mcp.ts`):

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

export interface TtcRunInput {
  aoiName: string                    // "g_sar_borneo"
  bbox: [number, number, number, number]   // [lngMin, latMin, lngMax, latMax]
  yearA: number                      // 2022
  yearB: number                      // 2023
  palsarAPath: string                // "/data/inputs/palsar_2022.tif"
  palsarBPath: string                // "/data/inputs/palsar_2023.tif"
  thresholds?: Partial<Thresholds>
}

export interface Thresholds {
  hvLossDb: number       // default -2.0
  waterDb: number        // default -24.0
  nonforestDb: number    // default -14.0
  mmuHa: number          // default 0.2
}

export interface TtcRunResult {
  runId: string
  alertsGeojsonHostPath: string      // resolved from container /data/ → host
  alertsCount: number
  validation: ValidationGate
}

export interface ValidationGate {
  usersAccuracy: number
  producersAccuracy: number
  f1: number
  alertAreaPctOfAoi: number
  pass: boolean
}

export class TtcMcpClient {
  private client: Client
  constructor(private url = "http://localhost:8100/mcp") {}

  async connect(): Promise<void> { /* StreamableHTTPClientTransport + handshake */ }

  async runPipeline(input: TtcRunInput): Promise<TtcRunResult> {
    // calls tool "run_recipe" with id="ttc_full" and the params above.
    // polls / streams progress notifications.
    // returns the host-side artifact path.
  }

  async listAlertFeatures(runId: string, limit = 5000): Promise<GeoJSON.Feature[]> {
    // calls "get_features" or reads the GeoJSON file from disk
  }

  async close(): Promise<void> { /* … */ }
}
```

Ingester (`mcp/client/src/ingest.ts`):

```ts
import { MongoClient } from "mongodb"
import { TtcMcpClient, TtcRunInput } from "./mcp.js"

export async function runAndIngest(input: TtcRunInput, mongoUri: string) {
  const mcp = new TtcMcpClient(); await mcp.connect()
  const result = await mcp.runPipeline(input)
  const features = await mcp.listAlertFeatures(result.runId)
  const mongo = await MongoClient.connect(mongoUri)
  const db = mongo.db("ttc")
  await db.collection("ttc_runs").insertOne({ /* runDoc per §7.1 */ })
  await db.collection("ttc_alerts").insertMany(features.map(toAlertDoc(result.runId)))
  await mongo.close(); await mcp.close()
  return result.runId
}
```

REST API (`mcp/api/src/server.ts`) — Express. Endpoints:

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/runs` | last 20 runs, summary fields |
| GET | `/api/runs/:run_id` | full run doc |
| GET | `/api/runs/:run_id/alerts` | GeoJSON FeatureCollection |
| GET | `/api/alerts?bbox=lng,lat,lng,lat&run_id=…` | GeoJSON within bbox |
| GET | `/api/alerts/frontier?run_id=…` | only `candidate_plantation_frontier === true` |
| GET | `/api/health` | `{ ok: true }` |

CORS open in dev to allow `http://localhost:5173` (Vite). Lock down in prod.

## 9. File layout (what you will create)

```
treefera-lcaw26-hackathon/
├── BUILD_CONTRACT.md                # ← do not edit
├── USP_AND_BORNEO_PILOT_TARGETS.md  # ← do not edit
├── HANDOFF_QGIS_MCP.md              # ← this file
├── neat-out/graph.json              # ← regenerate with `npx neat.is sync`
├── vendor/                          # ← gitignored
│   ├── qgis-stream-mcp/             # reference, do not edit
│   └── qgis-mcp-jjsantos/           # fallback ref
├── web/                             # ← existing frontend; touch only at §10.5
└── mcp/                             # ★ ALL YOUR WORK GOES HERE
    ├── README.md
    ├── compose.yml                  # extends vendor compose with our mounts
    ├── datasources.borneo.json      # PALSAR/S1/Hansen catalog
    ├── config/
    │   └── thresholds.json          # BUILD_CONTRACT §3 constants
    ├── recipes/
    │   ├── ttc_detect_change.json
    │   ├── ttc_validate.json
    │   └── ttc_full.json
    ├── client/                      # TS MCP client + Mongo ingester
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── mcp.ts
    │       ├── ingest.ts
    │       ├── types.ts
    │       └── cli.ts               # `npm run pipeline -- --aoi g_sar_borneo --years 2022,2023`
    └── api/                         # REST for the frontend
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── server.ts
```

### `mcp/compose.yml` sketch

```yaml
include:
  - path: ../vendor/qgis-stream-mcp/docker-compose.yml
services:
  qgisstreammcp:
    volumes:
      # Override the French defaults with our Borneo catalog and recipes
      - ./datasources.borneo.json:/app/datasources.json:ro
      - ./recipes:/app/recipes/ttc:ro
      # Mount the raw SAR inputs (read-only)
      - ${PALSAR_DIR:-/Volumes/Transcend/Downloads/sar data}:/data/inputs:ro
      # Outputs go to a host-visible dir
      - ./outputs:/data/outputs
```

### `mcp/datasources.borneo.json` minimum

```json
{
  "version": "1.0",
  "description": "Borneo SAR catalog for Through-the-Clouds.",
  "sources": [
    { "id": "cartodb_dark", "type": "xyz", "url": "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png", "category": "basemap" },
    { "id": "palsar_2022_local", "type": "raster_file", "path": "/data/inputs/annual 2/2022/palsar_G_sar_borneo_2022.tif", "category": "sar" },
    { "id": "palsar_2023_local", "type": "raster_file", "path": "/data/inputs/annual 2/2023/palsar_G_sar_borneo_2023.tif", "category": "sar" },
    { "id": "hansen_gfc_2023", "type": "wms", "url": "https://glad.umd.edu/...", "category": "reference" },
    { "id": "radd_alerts_2023", "type": "geojson", "url": "https://data.globalforestwatch.org/...", "category": "reference" }
  ]
}
```

## 10. Acceptance criteria

You're done when every item is checked.

1. **Container is healthy.** `cd mcp && docker compose up -d` → `curl http://localhost:8080/health` returns `200 OK`. noVNC at `http://localhost:6080` shows QGIS (proves Xvfb works).
2. **Recipe runs.** From the TS client: `npm run pipeline -- --aoi g_sar_borneo` returns within ~3 min, writes `mcp/outputs/<run_id>/alerts_2023.geojson` with ≥ 20 features, each having all 5 properties from BUILD_CONTRACT §3.10.
3. **Mongo ingest.** `mongosh "$MONGO_URI" --eval 'db.ttc_alerts.findOne()'` returns a valid GeoJSON Feature shaped per §7.2. `db.ttc_runs.findOne()` shows `validation.pass === true` (using the thresholds from BUILD_CONTRACT §4.4).
4. **REST API.** `curl 'http://localhost:4000/api/alerts?bbox=113.25,-1.25,113.75,-0.75'` returns a GeoJSON FeatureCollection. `curl http://localhost:4000/api/runs` returns a list of runs.
5. **(Stretch — only if §10.1–4 done and time remains)** Switch `web/src/data/mock.ts` to fetch from `http://localhost:4000/api/alerts` and assert the frontend MapView (when added) renders real data. **If you skip this, leave `web/` untouched.**
6. **Idempotency.** Running the same recipe twice produces two distinct `run_id`s, two `ttc_runs` docs, and no overwritten files.

## 11. Run book (5 commands)

```bash
# 1. ensure the vendor clone exists (idempotent)
test -d vendor/qgis-stream-mcp || git clone --depth 1 https://github.com/nic01asFr/QgisStreamMCP.git vendor/qgis-stream-mcp

# 2. bring up the container (uses ./mcp/compose.yml with overrides)
cd mcp && docker compose up -d --build && cd ..

# 3. install + run the TS pipeline
cd mcp/client && npm install && npm run pipeline -- \
  --aoi g_sar_borneo \
  --bbox 113.25,-1.25,113.75,-0.75 \
  --years 2022,2023 \
  --palsar-a "/data/inputs/annual 2/2022/palsar_G_sar_borneo_2022.tif" \
  --palsar-b "/data/inputs/annual 2/2023/palsar_G_sar_borneo_2023.tif" \
  --mongo "mongodb://localhost:27017"

# 4. start the read API
cd ../api && npm install && npm run dev    # serves :4000

# 5. verify
curl -s http://localhost:4000/api/runs | jq
```

## 12. Risks and pre-known gotchas

- **PALSAR rasters must be reachable from inside the container.** Either mount `/Volumes/Transcend` (mac-only, fragile), or copy a Borneo-clipped subset into `mcp/inputs/`. Recommend the latter for a stable demo.
- **MCP Streamable HTTP needs `@modelcontextprotocol/sdk` v0.6+.** Older versions only support stdio and will silently fail to connect.
- **Xvfb/QGIS sometimes refuses to start on macOS via Docker Desktop's qemu layer.** Healthcheck on `/health` catches this; restart usually fixes. If persistent, fall back to a Linux VM (Hetzner CX22 is €4/mo).
- **The Smart Loading 24h cache assumes data changes.** PALSAR mosaics don't — bump cache TTL to a month in `vendor/qgis-stream-mcp/src/qgis_helpers.py` if you ever fork.
- **`run_processing("gdal:polygonize", …)`** requires `OUTPUT` to be a writable path; in our mount, that's `/data/outputs/<run_id>/`. Make the dir from PyQGIS before calling.
- **MongoDB 2dsphere does not accept GeoJSON with > 1 ring** in odd configurations. Run `db.runCommand({ validate: "ttc_alerts" })` after first ingest to catch any bad polygons.
- **Don't add an Earth Engine path.** BUILD_CONTRACT §1 explicitly says "no Google Earth Engine in the critical path."

## 13. Decisions you (next dev) need to make

1. **Storage for raster + PDF artifacts.** S3-compatible bucket (MinIO local) or MongoDB GridFS for v0? *Default: GridFS for demo, S3 for prod.*
2. **Where Mongo lives.** Local docker (`mongo:7` service in the compose), or Atlas free tier? *Default: local; one less moving part.*
3. **Speckle filter implementation.** Pure PyQGIS via numpy/scipy, or call out to GRASS `r.li.fp` algorithms inside the container? *Default: numpy/scipy — fewer moving parts.*
4. **Validation visual check (SPOT-7).** Auto-classify alert points via a vision model, or flag for human review? *Default: human-review flag; visual classification is its own project.*
5. **API auth.** None for the demo, JWT for prod. *Default: none in dev, document the seam.*
6. **Whether to wire MapView in `web/`.** Stretch only — only if §10.1–4 ship cleanly with time left.

## 14. Out of scope — DO NOT TOUCH

- `BUILD_CONTRACT.md` — authoritative; don't edit. If the spec needs a change, raise it as a separate PR with reasoning.
- `USP_AND_BORNEO_PILOT_TARGETS.md` — commercial doc; do not edit.
- `web/` source files — exception only at §10.5, and only if everything else is green and a human said go.
- `vendor/qgis-stream-mcp/**` — read-only reference. All our customisations live in `mcp/`.
- Any branches other than the one you check out. PR back into `main` when done.

## 15. References

- [QgisStreamMCP repo](https://github.com/nic01asFr/QgisStreamMCP)
- [jjsantos01/qgis_mcp (alt)](https://github.com/jjsantos01/qgis_mcp)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MapLibre COG protocol](https://github.com/geomatico/maplibre-cog-protocol) — for §10.5 stretch
- [MongoDB Geospatial Queries](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [neat.is observability CLI](https://www.npmjs.com/package/neat.is)
- BUILD_CONTRACT.md (this repo)
- USP_AND_BORNEO_PILOT_TARGETS.md (this repo)

— end of handoff —
