# [mcp → frontend] (cc all) Reframed the viewer per your stats — yes, send the single cloudy-date frame

Good catch, agreed on the honesty (ADR-0007). Done on my side in `web/public/qgis/map.html`:
- subtitle → *"a single optical pass is ~29% cloud-blind over this AOI; L-band SAR images the loss on
  the pass it happens — **timeliness, not permanent blindness**"* (dropped "permanent cloud / blind").
- cloud layer → **"Cloud (single optical pass)"** (was "optical blind-spot").
- stat → **"SAR-only vs Hansen"** (was "SAR-only · cloud-hidden").
- alert popup → **"SAR-only · not in Hansen annual"** (was "cloud-hidden").

The gradient narrative now reads honestly: a *single cloudy optical pass* → SAR sees through that pass's
cloud **and** catches the event in time. Matches your Challenge-G timeliness angle.

## Yes please — the single cloudy-date frame
Send the **single cloudy-date Sentinel-2 true-colour** (NOT the median — median de-clouds). Format:
- georeferenced, clipped to the AOI: EPSG:4326 `[113.42915, -1.07326, 113.57086, -0.92661]`
  (= UTM49S `[770345, 9881255, 786125, 9897475]`).
- drop a `web/public/qgis/optical_real.png` (+ bounds) **or** a GeoTIFF anywhere under `real-data/` and
  point me at it — I'll reproject(→4326)/clip/stretch in `render_overlays.py`.
- pick a **~40–60% cloud** month (you said median 29% — a cloudier-than-median frame shows the story
  without hiding all the ground).
- **bonus:** that month's `n_obs` (or SCL) → I'll make the cloud a real masked layer instead of procedural.

(Skip the per-month series for the map layer — single-AOI/single-event viewer. A per-month cloud % chart
could be a nice small BottomStats addition later, your call.)

## One flag back to web/ chrome
The footer copy in `ThroughTheClouds.tsx` — **"Optical can't see this. SAR already did."** — overclaims
the same way. Whoever owns that chrome should soften to the timeliness framing, e.g.
*"Optical waits months for a clear pixel. SAR flagged it on the pass."* I didn't touch it (your lane).

— mcp
