# ADR-0009: Isometric / 2.5D pitch visualization

- **Status:** Accepted — **resolved 2026-06-25** (frontend already built; see Update below)
- **Date:** 2026-06-25
- **Workstream:** demo / frontend (amends BUILD_CONTRACT §6)

## Context

User requirement (stated twice): the data should be viewable in a **QGIS-like isometric /
2.5D view**, not a flat slippy map. `BUILD_CONTRACT.md` §6 specifies a **Folium** (Leaflet) map —
which is strictly 2D and **cannot tilt or extrude**, so it cannot satisfy this. The pitch
frontend is the Next.js / Vercel app (ADR-0008), which is where the isometric view belongs.

## Decision

The **pitch frontend renders an isometric / 2.5D scene**. Recommended approach:

- **MapLibre GL JS** with `pitch ≈ 50–60°` + adjustable `bearing`.
- **Alert polygons as `fill-extrusion`**, extrusion height ∝ severity
  (`|mean_delta_hv_db|` or `area_ha`) — clearings literally rise out of the canopy.
- **PALSAR HV** draped as a raster/hillshade surface; optional **DEM** (NASADEM) for terrain
  relief.

Alternative if a *true* (non-perspective) isometric is wanted: **deck.gl** `OrthographicView`
with an extruded `GeoJsonLayer`. The Folium §6 map is demoted to an **optional flat QA
artefact** for the pipeline's own sanity-checking; it is not the demo.

This stays fully compatible with **ADR-0008** (static hosting): MapLibre/deck.gl run client-side
over the same static `public/data/` bundle — no server change.

## Open sub-decisions (for the pre-build prose review)

1. MapLibre perspective-tilt vs deck.gl true-orthographic isometric.
2. What drives extrusion height (Δdb severity vs area), and the scale factor.
3. Whether to add a DEM terrain surface or keep a flat extruded base.

## Consequences

- ➕ A far more memorable, "impossible-looking" demo; the SAR alerts read as 3D scars.
- ➖ More frontend work than a flat map; mobile performance must be checked (extrusion + tilt on
  phones).
- ➕ No impact on hosting or the pipeline — purely a frontend rendering choice over the same data.

## Update (2026-06-25): resolved by `web/`

sguckiran one-shotted the frontend (origin/main `bde189a`, PR #1) at **`web/`** — React 19 + Tailwind +
shadcn/ui (**refactored Vite → Next.js App Router on 2026-06-25**; routes `/demo` = mock, `/` = live).
The isometric view is a **hand-rolled SVG 30° axonometric** (`web/src/lib/iso.ts`,
`prismFaces()` extrusion) rendered in `web/src/components/scene/IsometricScene.tsx`. MapLibre / deck.gl
are **not** used. The renderer sub-decisions above are therefore moot. The prior Chablis frontend
(`solution/webapp/`) is deleted; `web/` is the only frontend.

**Binding consequence for the pipeline:** the demo consumes a typed `Alert[]` JSON (see
`web/src/data/mock.ts`), with `centroid` normalised to `[0,1]` within the AOI bbox — **not** GeoJSON
geometry or raster overlays. The export step (ADR-0008) must emit that shape, not PNG tiles.
