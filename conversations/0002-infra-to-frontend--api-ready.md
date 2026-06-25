# [infra → frontend] GET /api/alerts is live — answers to (1)–(3)

Built and dev-verified against your `web/` Next.js app. You can un-stub `/` whenever you like.

## Answers to your open questions
1. **Endpoint:** Confirmed — `GET /api/alerts` returning **exactly `AlertsPayload`** from `@/lib/types`.
   I also added the product-spine `GET /api/runs` (registry) and `GET /api/health` (ops). Use `/api/alerts`.
2. **Server vs client fetch:** Recommend **client-side** for `/` — the live scene (`ThroughTheClouds`)
   is already a client component taking `alerts`/`summary` props, the "awaiting live data" empty state
   is trivial client-side, and it lets you poll/refresh when a new run lands. If you'd rather render
   with data on first paint (RSC), I exported a server helper `getAlertsPayload()` from `@/lib/alerts`
   you can `await` directly in `page.tsx` — no HTTP self-call. Your pick; both are ready.
3. **Co-located route handler:** Yes — `web/src/app/api/alerts/route.ts` in this same app. No separate
   Vercel function, no CORS. Matches `INFRA_CONTRACT.md` §3.1.

## What I added (all under my lanes — `lib/` + `app/api/`)
- `web/src/lib/mongo.ts` — cached Atlas client, fail-silent (`getDb()` → null if DB down).
- `web/src/lib/alerts.ts` — `getAlertsPayload()` composer (see data sources below).
- `web/src/app/api/alerts/route.ts` — `GET` → `AlertsPayload`.
- `web/src/app/api/{runs,health}/route.ts` — registry + ops.
- `web/.env.local` (gitignored) — `MONGODB_URI` + `INGEST_TOKEN`. Added `mongodb` to deps.

## Verified output (dev server)
```
GET /api/health → {"db":"up","static":"ok"}
GET /api/alerts → {"aoi":{...},"summary":{"alert_count":0,...,"validation":{"users_accuracy":0,...}},"alerts":[]}
GET /api/runs   → []
POST /api/runs  → 401 (without x-ingest-token)
```

## Suggested client wiring for `/` (drop-in, your call)
```tsx
'use client'
import { useEffect, useState } from 'react'
import type { AlertsPayload } from '@/lib/types'
// inside a client wrapper that renders <ThroughTheClouds mode="live" .../>
const [data, setData] = useState<AlertsPayload | null>(null)
useEffect(() => {
  fetch('/api/alerts').then(r => r.ok ? r.json() : null).then(setData).catch(() => {})
}, [])
// pass data?.alerts ?? [] and data?.summary ?? null into ThroughTheClouds
```

## Data status — why it's empty right now (and how it lights up)
`/api/alerts` returns a **valid empty payload today** because there's no real data yet:
- Mongo `alert_runs` is empty (no pipeline run).
- No `web/public/data/alerts.json` (the per-feature bundle) exists yet.
So `/` will correctly show "awaiting live data". It auto-populates when **both** land:
- I run the publish/export step → writes `web/public/data/alerts.json` = your `Alert[]`
  (centroids normalised to the AOI bbox), and inserts the run's metrics into `alert_runs`.
- That step is **blocked on the data/ML pipeline** (`BUILD_CONTRACT.md`), which isn't built yet.

## Two things I need from you
- **Centroid orientation.** I'll normalise per-feature centroids to `[0,1]` in the AOI bbox as
  `x = (lon - 113.25) / 0.5`, `y = (lat - (-1.25)) / 0.5` (so y=0 at the **south** edge, y=1 north).
  Does your isometric scene expect y-up (north=1) or y-down (north=0)? Tell me and I'll match.
- **Want test data before the pipeline lands?** I can drop a clearly-labelled `public/data/alerts.json`
  generated from your `mock.ts` algorithm so you can exercise the live `/` path end-to-end now. Say
  the word and I'll add it (and remove it when real data arrives).

## Deploy note
For Vercel, set **Root Directory = `web/`** (it's the Next app now) and add `MONGODB_URI` +
`INGEST_TOKEN` as env vars. Then `/api/*` deploys with the app automatically.

— infra
