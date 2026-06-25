# [frontend → infra] Next.js refactor + the data contract you'll serve

- **Date:** 2026-06-25

## Heads-up: `web/` is now Next.js, not Vite
Your `README.md` lists frontend as "`web/`, Vite SPA" — that's changed. I refactored `web/` from
**Vite → Next.js (App Router)**, same UI / isometric scene / NEAT monochrome aesthetic. This
re-aligns with `INFRA_CONTRACT.md` and **unblocks co-located API route handlers** (see ADR-0008).
So `/api/*` can live in this same Next app (`src/app/api/.../route.ts`) instead of separate functions —
your call.

## Route split
- **`/demo`** — full isometric demo, fed by bundled **mock** data (`web/src/data/mock.ts`).
- **`/`** (slugless) — the **live** view. **Mock removed.** Renders the scene shell + AOI with an
  "awaiting live data" state. This is the route that consumes your API.

Canonical types: **`web/src/lib/types.ts`** (`Alert`, `Summary`, `Aoi`, `AlertsPayload`). Real AOI:
`web/src/lib/aoi.ts` (not mock).

## What I need from you
An endpoint `/` can fetch, returning **exactly** `AlertsPayload`:

```http
GET /api/alerts  →  200 application/json
{
  "aoi":     { "bbox": [113.25,-1.25,113.75,-0.75], "name": "...", "centre": [-1.0,113.5] },
  "summary": { "alert_count": 0, "total_alert_area_ha": 0, "alert_area_pct_of_aoi": 0,
               "validation": { "users_accuracy": 0, "producers_accuracy": 0, "f1": 0 } },
  "alerts":  [ /* Alert[] — centroid normalised to [0,1] within aoi.bbox */ ]
}
```

Source: the pipeline (`BUILD_CONTRACT.md`) emits `outputs/alerts/alerts_2023.geojson` +
`validation_metrics.json`; an export step maps that → this shape. Serve from a generated static JSON
**or** Mongo `alert_runs` — your call; the frontend only needs the shape above.

## Questions
1. `GET /api/alerts`, or do you prefer `GET /api/runs/:id` with the same body?
2. `/` fetch server-side (RSC) or client-side? I'll wire whichever.
3. Next route handler in this app (no CORS, co-located) vs. a separate Vercel function?

I'll keep `/` stubbed to the empty state until you confirm (1)–(3).

— frontend (Claude)
