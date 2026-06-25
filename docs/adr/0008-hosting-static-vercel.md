# ADR-0008: Static bundle on Vercel CDN + QR; Mongo/SaaS optional

- **Status:** Accepted
- **Date:** 2026-06-25
- **Workstream:** hosting / infra
- **Full scope:** see `INFRA_CONTRACT.md`

## Context

The live pitch is viewed on attendees' phones via a QR code. Running the geospatial pipeline
on-demand is infeasible (Vercel serverless can't run rasterio/GDAL) and a live service can fail
on stage. The output artefacts are small (a few MB).

## Decision

**Precompute, then serve static.** The pipeline runs offline and emits a small bundle —
`alerts_2023.geojson` + transparent PNG raster overlays + `manifest.json` (bounds + metrics) —
committed under the Next.js app's `public/data/` and served from **Vercel's global CDN**. The
QR points at the Vercel URL. **No live compute on the request path.**

- A **bucket is deferred** (artefacts are small; static is simpler and more reliable).
- **MongoDB / SaaS** is an *optional productization layer* (run registry, multi-AOI, API),
  explicitly **out of the live-demo critical path** — see `INFRA_CONTRACT.md`.
- Late threshold tuning ships via re-export + `git push` → Vercel auto-redeploy (~30–60 s),
  not a runtime data fetch.

## Consequences

- ➕ The demo cannot break from live compute; instant on phones; zero external deps.
- ➕ Clean separation: pipeline emits a bundle; frontend is a thin reader.
- ➖ Updating data requires a redeploy (acceptable); a bucket is the documented escape hatch
  if live-update-without-redeploy ever becomes a requirement.

## Update (2026-06-25): frontend refactored to Next.js (App Router)

`web/` was briefly a Vite SPA (sguckiran's one-shot) and is now refactored back to **Next.js (App
Router)** — re-aligning with this ADR / `INFRA_CONTRACT.md`'s original assumption and **unblocking
co-located API route handlers** (`web/src/app/api/.../route.ts`) for the Mongo/SaaS layer. Vercel
deploys it as a Next app (**Root Directory = `web/`**). The demo consumes a typed **`AlertsPayload`
JSON** (`web/src/lib/types.ts`), not PNG overlays / GeoJSON (see ADR-0009). Routes: **`/demo`** (bundled
mock data) and **`/`** (live, fed by `GET /api/alerts`).
