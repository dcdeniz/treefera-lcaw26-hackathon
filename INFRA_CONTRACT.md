# Through the Clouds — Infrastructure Contract (Backend / SaaS Workstream)

## 0. Reviewer's brief

This document scopes the **infrastructure / backend / "SaaS" workstream** and hands it off to a
downstream executor agent. It is a sibling to `BUILD_CONTRACT.md` (the data/ML pipeline contract)
and obeys the same rules: every path, env var, collection name, and gate is explicit so any step can
be run in isolation.

It exists to answer one uncomfortable question honestly, up front:

> **The live pitch demo is a single-AOI static site. It does not need a database. So why is there a
> MongoDB / SaaS workstream at all?**

Answer: because the *pitch* and the *product* are two different artefacts. The pitch is one AOI
(Central Kalimantan), precomputed offline, served as static files from Vercel's CDN behind a QR code
(locked in **ADR-008**). The product is "run this detector over *any* AOI, *any* year-pair, keep a
history of runs and their accuracy, and let a customer log in and look at their estate." MongoDB
earns its place **only in the second story.** This contract makes that boundary load-bearing: the
database is a *progressive enhancement layer* that must never sit in the critical path of the demo.

If you read nothing else, read **§1 (non-goals)** and **§2 (where Mongo fits)**. The rest is execution
detail.

---

## 1. Scope & non-goals

### 1.1 What this workstream owns

| Owns | Detail |
|---|---|
| Vercel project & deployment | Root dir, build settings, env vars, CI/CD from GitHub, custom domain for the QR URL |
| The static-bundle **publish step** | The offline `export_web`-style step that copies the pipeline's artefacts into `solution/webapp/public/data/` and commits them |
| MongoDB Atlas (M0) | Cluster, database, collections, indexes, connection-string handling, network/IP access |
| Next.js API routes (optional layer) | The `/api/*` surface that reads from Mongo *when present*, with static-file fallback |
| Secrets management | `.env.local`, Vercel env vars, never committing a connection string |
| Observability & cost guardrails | Logging, rate limiting, staying inside Atlas M0 + Vercel Hobby free tiers |

### 1.2 Hard non-goals (do NOT do these)

1. **Do not put a database in the demo's critical path.** The QR-code path is:
   `phone → Vercel CDN → static files in public/`. No `/api` call, no Mongo query, no env var is
   allowed to be *required* for that path to render the map, the alerts, and the metrics. If Atlas is
   down, paused (M0 auto-pauses after inactivity), or the connection string is missing, the demo
   **must still work**.
2. **Do not run the geospatial pipeline on Vercel.** `rasterio`/GDAL/`geopandas` do not run in the
   Vercel serverless runtime. The pipeline (`BUILD_CONTRACT.md` §3) runs **offline**; this workstream
   only ingests its *outputs*.
3. **Do not migrate the existing demo data flow.** The frontend already reads
   `solution/webapp/public/data/{manifest.json, *.png, aoi.geojson}` via `fetch` (see
   `solution/webapp/app/MapConsole.js`). Do not break that contract; extend it additively.
4. **Do not build auth/tenancy for the pitch.** Accounts are a §5 productization concern, gated behind
   an explicit reviewer decision. The pitch demo is public and anonymous (that is the *point* of the QR
   code).
5. **Do not introduce a second hosting target or a bucket.** ADR-008 deferred object storage because
   artefacts are a few MB and fit in git + CDN. Do not reverse that without a reviewer decision (§8).

### 1.3 The static demo path is sacred

Concrete invariant to test on every change (the gate for the whole workstream):

> With `git stash` of every backend change, **and** with no `MONGODB_URI` set in the environment,
> `cd solution/webapp && npm run build && npm start` produces a site where the map, the alert
> polygons, and the validation HUD all render from `public/data/` alone.

If that ever fails, the change is rejected.

---

## 2. Where Mongo fits — the key decision (demo vs product)

### 2.1 The honest table

| Question | Static files (today) | MongoDB adds… | Verdict for a 1-day hackathon |
|---|---|---|---|
| Render one AOI's alerts on a map | ✅ `alerts_2023.geojson` in `public/` | nothing | **Static wins. Mongo is pure overhead here.** |
| Show this run's metrics | ✅ `validation_metrics.json` | nothing | Static wins |
| Toggle PALSAR HV 2022/2023 rasters | ✅ transparent PNGs in `public/` | nothing | Static wins |
| "Show me run #3 from yesterday with threshold −2.5 dB" | ❌ only the latest bundle exists | a queryable **history of runs** | **Mongo wins** — but only if we run the pipeline more than once |
| "List every AOI we've ever processed" | ❌ | an `aois` registry | Mongo wins (product story) |
| "Which threshold gave the best F1 across runs?" | ❌ | a `tuning_log` you can aggregate | Mongo wins (product story) |
| "Find all alerts within 5 km of this point" across AOIs | ❌ (one file, one AOI) | a `2dsphere` geospatial query | Mongo wins **at scale only** |
| Filter the single AOI's alerts by `area_ha`/frontier flag | ✅ client-side filter in JS on a few-hundred-feature file | marginal | **Static wins** at demo scale |

**Conclusion to state out loud in the pitch:** *for the live demo, the database is deliberately not in
the loop — that is why the demo is bulletproof.* MongoDB is the **"what this becomes" layer**: the
moment you process a *second* AOI or a *second* year-pair, the static-file approach stops scaling and a
run registry + geospatial index start paying for themselves. The workstream builds that layer as a
demonstrable-but-optional capability ("here's the product spine"), not as a dependency of the pitch.

### 2.2 Proposed data model (MongoDB Atlas M0)

Database: `through_the_clouds`. Three collections. Designed so the pipeline's *existing* outputs
(`BUILD_CONTRACT.md` §3.10, §4.3, §4.4) map onto documents with **no new data invented**.

#### `aois` — the AOI registry
```jsonc
{
  "_id": "G_sar_borneo",                       // stable aoi_id (matches Drive/AEF naming)
  "name": "SAR through clouds — Borneo option",
  "country": "Indonesia",
  "bbox": [113.25, -1.25, 113.75, -0.75],      // analysis bbox, EPSG:4326 (BUILD_CONTRACT §1)
  "hotspot_geometry": { "type": "MultiPolygon", "coordinates": [/* from G_sar_borneo_aoi.geojson */] },
  "approx_size_km": "20 x 20",
  "created_at": "2026-06-25T00:00:00Z"
}
```
Source of truth: `data/drive_raw/boundary-files/G_sar_borneo_aoi.geojson` + the bbox in
`BUILD_CONTRACT.md` §1. One document for the demo AOI; the schema generalises to the nine AEF AOIs.

#### `alert_runs` — one document per pipeline execution (the spine)
```jsonc
{
  "_id": "<ObjectId>",
  "aoi_id": "G_sar_borneo",                    // → aois._id
  "year_pair": [2022, 2023],                   // BUILD_CONTRACT §1 "Years compared"
  "thresholds": {                              // exactly the tunables from src/config.py
    "hv_loss_db": -2.0,                        // §3.8 delta_hv threshold
    "water_db": -24.0,                         // §3.7 water mask
    "nonforest_db": -14.0,                     // §3.7 existing-nonforest mask
    "mmu_ha": 0.2,                             // §3.9 min mapping unit
    "frontier_area_ha": 1.0,                   // §3.10 candidate_plantation_frontier rule
    "frontier_delta_db": -3.0
  },
  "metrics": {                                 // verbatim from validation_metrics.json (§4.4)
    "producers_accuracy": 0.0,
    "users_accuracy": 0.0,
    "f1": 0.0,
    "alert_area_pct_of_aoi": 0.0,
    "sample_size": 0
  },
  "artifact_uris": {                           // RELATIVE paths under the Vercel public/ root
    "alerts_geojson": "/data/alerts_2023.geojson",
    "alerts_gpkg":    "/data/alerts_2023.gpkg",          // download-only; not web-rendered
    "alert_mask":     "/data/alerts_2023_mask.tif",      // download-only
    "hv_2022_png":    "/data/hv_2022.png",
    "hv_2023_png":    "/data/hv_2023.png",
    "manifest":       "/data/manifest.json"
  },
  "git_sha": "<commit that produced the bundle>",
  "pipeline_passed": true,                     // §4.4 gate: UA≥0.75 ∧ PA≥0.65 ∧ F1≥0.70 ∧ area∈[0.2,8]%
  "created_at": "2026-06-25T00:00:00Z"
}
```
This is the single highest-value collection. Every offline pipeline run that produces a bundle inserts
one `alert_runs` document. It is the durable memory that the static bundle (which only ever holds *the
latest* run) cannot keep — directly addressing `BUILD_CONTRACT.md` §8.7 ("Memory of the run").

#### `tuning_log` — the C↔D threshold-tuning loop, made queryable
```jsonc
{
  "_id": "<ObjectId>",
  "run_id": "<alert_runs._id>",                // optional back-ref
  "aoi_id": "G_sar_borneo",
  "iteration": 1,
  "changed": { "hv_loss_db": [-2.0, -3.0] },   // before/after (BUILD_CONTRACT §10 fallbacks)
  "reason": "raw alert area > 15% of AOI",     // which §3.8 gate tripped
  "resulting_metrics": { "f1": 0.0, "alert_area_pct_of_aoi": 0.0 },
  "created_at": "2026-06-25T00:00:00Z"
}
```
This makes the orchestrator's tuning history (`BUILD_CONTRACT.md` §2 agent F, §10) inspectable and
aggregatable ("which threshold maximised F1?").

### 2.3 The storage tradeoff: whole-GeoJSON blob vs per-feature documents

The most consequential modelling decision. Two options:

**Option A — store the whole `alerts_2023.geojson` as one blob.**
- Either an `artifact_uris.alerts_geojson` *pointer* (the file stays in `public/`, Mongo just
  references it), or the entire FeatureCollection embedded in the `alert_runs` doc.
- ✅ Trivial; the frontend already fetches the file; zero query logic.
- ✅ Keeps Mongo and the static path perfectly aligned — the DB never becomes a *source* the demo
  depends on.
- ⚠️ Embedding the FeatureCollection risks the **16 MB BSON document limit** if an AOI ever produces
  thousands of alert polygons. For Central Kalimantan at MMU 0.2 ha this is comfortably under (low
  hundreds of features), but it does not generalise.
- ❌ Cannot do server-side geospatial or attribute queries.

**Option B — explode into per-feature `alerts` documents with a `2dsphere` index.**
```jsonc
{
  "_id": "<ObjectId>",
  "run_id": "<alert_runs._id>",
  "aoi_id": "G_sar_borneo",
  "geometry": { "type": "Polygon", "coordinates": [/* … */] },  // GeoJSON, indexed 2dsphere
  "area_ha": 1.7,
  "mean_delta_hv_db": -3.4,
  "min_delta_hv_db": -6.1,
  "baseline_hv_db": -8.2,
  "candidate_plantation_frontier": true
}
```
- ✅ Enables `$geoWithin` / `$near` queries and attribute filters across runs and AOIs — the actual
  product capability.
- ✅ No 16 MB ceiling; one doc per polygon.
- ❌ More ingest code; you must re-explode on every run; harder to keep byte-identical to the served
  file.

**Recommendation for the 1-day build:** **Option A by default** (pointer in `artifact_uris`), with
Option B's per-feature `alerts` collection built **only if** the geospatial-query demo is explicitly
prioritised (reviewer decision §8.3). Per-feature documents are the *right product answer* and the
*wrong demo answer* — they add ingest complexity for a capability the single-AOI pitch never exercises.
Note the per-feature properties are fixed and already specified by `BUILD_CONTRACT.md` §4.3:
`area_ha`, `mean_delta_hv_db`, `min_delta_hv_db`, `baseline_hv_db`, `candidate_plantation_frontier`.

Index plan (M0 supports indexes incl. `2dsphere`):
- `alert_runs`: `{ aoi_id: 1, created_at: -1 }` (list runs newest-first), `{ git_sha: 1 }`.
- `alerts` (only if Option B): `{ geometry: "2dsphere" }`, `{ aoi_id: 1, candidate_plantation_frontier: 1 }`.

---

## 3. API / backend surface

### 3.1 Where the backend lives

**Next.js API routes inside the existing app** (`solution/webapp/app/api/**`), **not** a separate
service. Rationale: one Vercel deploy, one repo, one CI/CD path, zero extra infra, fits Hobby tier.
A separate Node service is a §8 decision and is unjustified for a hackathon.

The driver is `mongodb` (official Node driver), with a connection cached on `globalThis` so serverless
function invocations reuse the pool (Vercel's documented pattern — do **not** open a new client per
request).

### 3.2 Progressive-enhancement contract (static-first)

Every endpoint follows the same rule, which is the whole architectural point:

> **The frontend reads the static bundle first and renders fully. The `/api/*` layer is queried only
> for *extra* capabilities (history, cross-AOI, filtering) and every call is wrapped so that a missing
> `MONGODB_URI`, a paused M0 cluster, or a non-200 response degrades silently to the static behaviour.**

In `MapConsole.js` terms: it keeps `fetch("/data/manifest.json")` and `fetch("/data/alerts_2023.geojson")`
as the primary, unconditional render path. Any new "run history" panel is an *additive* component that
calls `/api/runs` and renders nothing if the call fails.

### 3.3 Endpoints (build only what a reviewer green-lights)

| Method · Route | Reads | Returns | Demo-critical? |
|---|---|---|---|
| `GET /api/health` | Mongo ping | `{ db: "up"\|"down", static: "ok" }` | No — ops only |
| `GET /api/aois` | `aois` | AOI registry list | No |
| `GET /api/runs?aoi_id=` | `alert_runs` | runs newest-first (metrics + `artifact_uris`) | No — the headline product endpoint |
| `GET /api/runs/:id` | `alert_runs` | one run | No |
| `GET /api/runs/:id/alerts` | file pointer or `alerts` | the run's GeoJSON (proxied from `artifact_uris`, or assembled from Option-B docs) | No |
| `GET /api/alerts/near?lng=&lat=&km=` | `alerts` (Option B only) | `$near` results | No — geospatial showcase |
| `POST /api/runs` | — | inserts an `alert_runs` doc | No — **publish-time only, auth-gated** (§5) |

`POST /api/runs` is the one write path. It is **not** called from the browser in the demo; it is called
by the offline publish step (§4.5) or curled by an operator. Protect it with a shared secret
(`INGEST_TOKEN`) even in the hackathon build so a public Vercel URL can't be spammed with writes.

---

## 4. Sysadmin / deployment

### 4.1 Vercel project configuration

The repo root is **not** the Next.js app — the app is nested at `solution/webapp/`. This is the single
most common deployment footgun here.

| Setting | Value |
|---|---|
| Git repository | `github.com/dcdeniz/treefera-lcaw26-hackathon` (current `origin`), branch `main` |
| **Root Directory** | `solution/webapp` ← set this in Vercel project settings, or builds fail |
| Framework preset | Next.js (auto-detected once root dir is correct) |
| Build command | `next build` (default) |
| Output | `.next` (default; do **not** use static export — API routes need the serverless runtime) |
| Install command | `npm install` (a `package-lock.json` already exists in `solution/webapp`) |
| Node version | 20.x (pin in Vercel project settings) |

Note: the root `.gitignore` already ignores `.next/`, `node_modules/`, `out/`, `build/`, and crucially
`data/` and `real-data/` — but **`solution/webapp/public/data/` is NOT ignored**, so the committed
artefact bundle ships with the repo. Verify this stays true (it is what makes static-first work).

### 4.2 Atlas setup (M0 free tier)

1. Create an Atlas project + **M0** (free, shared) cluster, region near the judges (e.g. `eu-west`).
2. Create DB user `ttc_app` with `readWrite` on `through_the_clouds` only (least privilege).
3. Network access: M0 has no static egress IPs from Vercel, so add `0.0.0.0/0` to the IP allowlist
   (documented Vercel+Atlas pattern) **and** rely on user credentials + TLS as the real control. Flag
   this openly (§8) — it is a known free-tier compromise, acceptable for a hackathon, not for prod.
4. Connection string form:
   `mongodb+srv://ttc_app:<password>@<cluster>.mongodb.net/through_the_clouds?retryWrites=true&w=majority`.
5. **M0 auto-pauses after ~60 days idle and throttles aggressively** — another reason it must never be
   demo-critical. The first query after a pause is slow; the static path absorbs that.

### 4.3 Secrets management

| Secret | Local | Vercel |
|---|---|---|
| `MONGODB_URI` | `solution/webapp/.env.local` (gitignored via `.env*`) | Project → Settings → Environment Variables (Production + Preview) |
| `INGEST_TOKEN` | `.env.local` | same |
| `NEXT_PUBLIC_*` (none needed yet) | — | — |

Provide a committed `solution/webapp/.env.example` listing **names only**, no values. The root
`.gitignore` already excludes `.env` and `.env.*` while allowing `!.env.example`. Never paste a live
connection string into the repo, a commit, or this doc.

### 4.4 GitHub → Vercel CI/CD

- Connect the Vercel project to the GitHub repo. Push to `main` → Production deploy; PRs → Preview
  deploys (each gets a URL — useful for checking a new bundle before it goes live).
- No GitHub Actions required; Vercel's native integration covers build + deploy.
- The deploy is triggered by the **artefact commit** (§4.5), so "publish a new run" == "git push".

### 4.5 The static-bundle publish step (the bridge from pipeline to web)

This is the seam between `BUILD_CONTRACT.md` and this contract. The pipeline writes to
`outputs/alerts/` and `outputs/intermediate/`. The web app serves from `solution/webapp/public/data/`.
A publish script bridges them. Model it on the existing `solution/export_web.py` (which already
reprojects rasters to EPSG:4326, writes transparent PNGs, and emits a `manifest.json`).

Idempotent publish step (offline, on a machine with GDAL — **never on Vercel**):
1. Read `outputs/alerts/alerts_2023.geojson`, `.gpkg`, `alerts_2023_mask.tif`,
   `outputs/intermediate/hv_{2022,2023}_filt_db.tif`, `outputs/alerts/validation_metrics.json`.
2. Reproject the two HV rasters to EPSG:4326 → transparent PNGs (`hv_2022.png`, `hv_2023.png`) with
   per-layer bounds, exactly as `export_web.py` does for the Chablis layers.
3. Copy `alerts_2023.geojson` and `aoi.geojson` into `public/data/`.
4. Write `public/data/manifest.json` (schema in §6.2) including bounds + the five
   `validation_metrics.json` fields.
5. `git add solution/webapp/public/data && git commit && git push` → Vercel auto-deploys.
6. **Optionally** (Mongo layer): `POST /api/runs` (or a direct insert) with the `alert_runs` document
   (§2.2), tagging `git_sha` = the commit from step 5.

Gate: after deploy, the production URL renders the Borneo alerts and the validation HUD with **no**
`/api` call required (verify in browser devtools that the only requests are to `/data/*`).

### 4.6 DNS / custom domain for a clean QR URL

- A `*.vercel.app` URL is QR-able but ugly. A short custom domain (e.g. `clouds.<something>.dev` or a
  free/already-owned domain) makes the QR denser-free and the URL trustworthy on a phone.
- Add the domain in Vercel → Domains; set the registrar's DNS (CNAME to `cname.vercel-dns.com` or the
  apex A/ALIAS Vercel prescribes). TLS is auto-provisioned by Vercel.
- Generate the QR **from the final domain**, after DNS verifies — not from the preview URL. Test the QR
  on a real phone on cellular (not just venue wifi) before the pitch.
- This is optional polish; the `*.vercel.app` URL works if DNS is a time sink.

---

## 5. SaaS-y layer (justify or omit)

Everything here is **product narrative**, not pitch-demo. Build only what a reviewer green-lights (§8);
default is to *describe* it and ship `alert_runs` history as the one tangible SaaS spine.

| Capability | Justified for hackathon? | Plan |
|---|---|---|
| **Auth / accounts** | ❌ Not for the public QR demo (anonymous is the point). | If shown, use a managed provider (NextAuth/Auth.js or Clerk free tier) on a *separate* `/app` route, never gating `/` or `/data/*`. |
| **Multi-tenancy** | ❌ Overkill for one AOI. | Schema is tenancy-ready: add `org_id` to `aois`/`alert_runs` later; do not build the enforcement now. |
| **Rate limiting** | ⚠️ Only on writes. | Gate `POST /api/runs` with `INGEST_TOKEN`. For reads, Vercel Hobby + CDN caching absorbs demo traffic; add Upstash-style limiting only if a public write endpoint is exposed. |
| **Observability / logging** | ✅ Cheap and worth it. | Vercel's built-in function logs + a `/api/health` endpoint. Structured `console.log({ route, ms, ok })` per API call. No paid APM. |
| **Cost** | ✅ Hard constraint. | **Everything must fit Atlas M0 (free, 512 MB) + Vercel Hobby (free).** A few MB of bundle, low-hundreds of docs, a handful of QR hits — orders of magnitude inside both. No bucket, no paid add-ons (ADR-008). |

The honest SaaS pitch line: *"The verification layer is the product; the run registry (`alert_runs`)
is its spine. Accounts, tenancy, and alerting are schema-ready and cheap to add — we left them out of
the live demo on purpose so the demo can't break."*

---

## 6. Handoff contracts

### 6.1 Consumed FROM the pipeline (`BUILD_CONTRACT.md` → this layer)

The artefact bundle this workstream ingests. **Do not invent fields; these are fixed upstream.**

**`outputs/alerts/alerts_2023.geojson`** — FeatureCollection, EPSG:4326. Per-feature properties
(`BUILD_CONTRACT.md` §3.10 / §4.3), exactly:
| Property | Type |
|---|---|
| `area_ha` | float |
| `mean_delta_hv_db` | float |
| `min_delta_hv_db` | float |
| `baseline_hv_db` | float |
| `candidate_plantation_frontier` | bool |

Also produced: `alerts_2023.gpkg` (download/desktop), `alerts_2023_mask.tif` (alert raster mask),
and PALSAR HV 2022/2023 rasters → reprojected to PNG overlays at publish time.

**`outputs/alerts/validation_metrics.json`** (`BUILD_CONTRACT.md` §4.4):
```jsonc
{ "producers_accuracy": <float>, "users_accuracy": <float>, "f1": <float>,
  "alert_area_pct_of_aoi": <float>, "sample_size": <int> }
```
Pipeline pass gate (carry into `alert_runs.pipeline_passed`):
`users_accuracy ≥ 0.75 ∧ producers_accuracy ≥ 0.65 ∧ f1 ≥ 0.70 ∧ alert_area_pct_of_aoi ∈ [0.2, 8]`.

### 6.2 Exposed TO the frontend

**`manifest.json`** (the contract the existing `MapConsole.js` already depends on; extend additively,
do not remove keys). Today's shape (Chablis) at `solution/webapp/public/data/manifest.json` has
`aoi`, `center`, `layers.{name}.{west,south,east,north}`, `legend[]`, `metrics{}`. The Borneo
manifest mirrors it:
```jsonc
{
  "aoi": "G_sar_borneo — Central Kalimantan, Borneo",
  "center": [113.5, -1.0],                      // [lng, lat]
  "year_pair": [2022, 2023],
  "layers": {
    "alerts":  { "west":113.25,"south":-1.25,"east":113.75,"north":-0.75 },
    "hv_2022": { "west":..., "south":..., "east":..., "north":... },
    "hv_2023": { "west":..., "south":..., "east":..., "north":... }
  },
  "legend": [ { "name":"Alert (HV loss)", "hex":"#e23b3b" } ],
  "metrics": { /* the five validation_metrics.json fields, verbatim */ }
}
```
- Static files served from `public/data/`: `manifest.json`, `alerts_2023.geojson`, `aoi.geojson`,
  `hv_2022.png`, `hv_2023.png`. The frontend fetches these directly (no API).
- Optional API responses (when Mongo present): `/api/runs` returns an array of `alert_runs` documents
  (§2.2) for a "run history" panel; `artifact_uris` in each are **relative `/data/*` paths**, so a
  historical run's bundle can be loaded by the same static fetch machinery — *if* that bundle was
  committed. (Caveat: today's `public/` only holds the latest bundle; serving *old* bundles requires
  versioned paths or a bucket — flag as §8 decision; the demo does not need it.)

### 6.3 Naming reconciliation note

The committed bundle today is the **Chablis** demo (`predicted/truth/embeddings/sar` PNGs, French
AOI). The Borneo pipeline emits a **different** layer set (`alerts`, `hv_2022`, `hv_2023`). The
publish step (§4.5) replaces the bundle; the frontend's `LAYERS` array and HUD copy in `MapConsole.js`
must be updated to match the Borneo manifest. That frontend edit is a **frontend-workstream** task, not
this one — but this contract must hand over the exact manifest schema (§6.2) so they can.

---

## 7. Ordered task list for the downstream executor

Each step is idempotent and has an exit gate. Steps 1–4 are the **demo-safe baseline** (no Mongo).
Steps 5–9 are the **optional product layer**, gated by reviewer decisions (§8). Do 1–4 first; do not
start 5+ until the §1.3 invariant passes.

| # | Task | Idempotent? | Exit gate |
|---|---|---|---|
| 1 | Create Vercel project, set **Root Directory = `solution/webapp`**, Node 20, framework Next.js | yes | A push to `main` produces a successful Production deploy serving the current bundle |
| 2 | Verify the §1.3 invariant on the deployed URL: map + alerts + HUD render with only `/data/*` requests | yes | Browser devtools shows zero `/api` calls; no env var required |
| 3 | (Custom domain, optional) add domain in Vercel, set DNS CNAME, wait for TLS | yes | Custom URL loads over HTTPS; QR generated from it scans on a phone over cellular |
| 4 | Write/adapt the offline publish step (model on `export_web.py`) to emit the **Borneo** bundle (§4.5) into `public/data/` | yes | `manifest.json` has the five metric fields + layer bounds; `alerts_2023.geojson` features carry the five properties; commit+push redeploys |
| 5 | Provision Atlas M0, DB `through_the_clouds`, user `ttc_app`, IP allowlist; put `MONGODB_URI` in Vercel + `.env.local`; commit `.env.example` (names only) | yes | `/api/health` (step 6) returns `db: "up"`; no secret in git |
| 6 | Add `solution/webapp/lib/mongo.ts` (cached `globalThis` client) + `GET /api/health` | yes | `curl /api/health` → `{db:"up",static:"ok"}`; killing `MONGODB_URI` returns `db:"down"` and the site still renders |
| 7 | Insert the `aois` document + create `alert_runs` collection & indexes; wire the publish step to `POST /api/runs` (or direct insert) with `git_sha` | yes | After a publish, `alert_runs` has one doc whose `metrics` == `validation_metrics.json` and `pipeline_passed` reflects the §6.1 gate |
| 8 | Add `GET /api/runs?aoi_id=` (newest-first) consumed by an **additive, fail-silent** run-history panel | yes | Panel lists runs when Mongo is up; with Mongo down the panel renders nothing and the map is unaffected |
| 9 | (Only if §8.3 says so) per-feature `alerts` collection + `2dsphere` index + `GET /api/alerts/near` | yes | `$near` query returns features for the Borneo AOI; static demo unchanged |

Stop-and-ship line: **after step 4 the pitch is fully deliverable.** 5–9 are the productization story.

---

## 8. Open decisions for human reviewers

1. **Is the database in the pitch at all?** Default per this contract: *no for the critical path,
   yes as an optional "this is the product" side-panel.* Confirm, or cut Mongo entirely for the
   hackathon and keep it purely as a slide.
2. **Atlas IP allowlist.** Accept `0.0.0.0/0` + credentials/TLS for the hackathon (no static Vercel
   egress IPs on free tier), or invest in a stricter setup? Recommended: accept it, flag it as a known
   prod gap.
3. **Alert storage shape (§2.3).** Pointer/blob (Option A, default) vs per-feature `2dsphere`
   documents (Option B). Build Option B only if the geospatial-query demo is a priority.
4. **Run versioning in `public/`.** Today only the latest bundle is committed. Do we need to serve
   *historical* runs' artefacts (→ versioned `/data/runs/<sha>/…` paths or a bucket, reversing the
   ADR-008 deferral), or is a metrics-only history in Mongo enough? Default: metrics-only; do not add a
   bucket.
5. **Auth/accounts (§5).** Show a logged-in `/app` view, or keep everything anonymous? Default:
   anonymous; describe accounts as schema-ready future work.
6. **Custom domain.** Worth the DNS time for a prettier QR, or ship the `*.vercel.app` URL? Default:
   nice-to-have, not a blocker.
7. **Who runs the publish step?** A human operator on a GDAL-capable laptop, or an offline CI job?
   (It cannot run on Vercel.) Default: human/laptop for the hackathon.
8. **Write-endpoint protection.** `INGEST_TOKEN` shared secret is the minimum. Confirm that is
   sufficient, or drop `POST /api/runs` and insert via a one-off script only (no public write surface
   at all). Recommended: script-only insert for the hackathon; expose the endpoint later.

---

## 9. Tech stack lock

TypeScript/Node throughout, to match the existing Next.js app (`solution/webapp` currently uses JS;
new API/lib files may be `.ts` — Next 14 supports mixed JS/TS). Minimal surface, free tiers only.

| Layer | Choice | Notes |
|---|---|---|
| App framework | **Next.js 14.2.x** (existing) | App Router; API routes under `app/api/**`. Bump `next` before any public deploy (a security advisory is noted in `solution/webapp/README.md`). |
| Runtime | **Node 20** on Vercel | Not Edge runtime — the Mongo driver needs Node APIs. |
| DB driver | **`mongodb`** (official Node driver) | Cached client on `globalThis`; no Mongoose (overkill for 3 collections). |
| Database | **MongoDB Atlas M0** (free) | DB `through_the_clouds`; collections `aois`, `alert_runs`, optional `tuning_log`, optional `alerts`. |
| Hosting | **Vercel Hobby** (free) | Root dir `solution/webapp`; static bundle in `public/data/`; CDN. |
| Map (existing) | **MapLibre GL 4.7** | Unchanged; consumes `manifest.json` + PNG/GeoJSON from `public/`. |
| Secrets | `.env.local` (local) + Vercel env vars | `MONGODB_URI`, `INGEST_TOKEN`. `.env.example` committed (names only). |
| Auth (only if §8.5) | Auth.js or Clerk free tier | Off by default; never gates `/` or `/data/*`. |

No new languages, no separate backend service, no message queue, no object storage, no paid tiers.

---

## 10. The one-paragraph summary for a judge

The live demo is a static Next.js site on Vercel's CDN behind a QR code, serving precomputed Borneo
alert GeoJSON, PALSAR HV PNG overlays, and a metrics manifest straight from `public/` — no database
touches the pitch, by design, which is exactly why it can't break. MongoDB Atlas (free M0) is the
**productization spine**: an `alert_runs` registry that remembers every offline pipeline execution
(its AOI, year-pair, thresholds, accuracy, artefact URIs, and git SHA), an `aois` registry, and a
`tuning_log` — turning a one-shot static artefact into a queryable, multi-AOI, multi-run service. We
built the spine and left auth, tenancy, and geospatial-at-scale as cheap, schema-ready next steps,
because the honest engineering call for a one-day build is: *static where static suffices, database
where history and scale begin.*
