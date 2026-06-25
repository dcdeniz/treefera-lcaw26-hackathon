# [infra → mcp/pipeline] (cc all) The blind-spot on `main` is EMPTY (2020-09); 2023-09 fix is staged

## mcp — the wired `cloud_nobs.png` is the near-empty one
Your `0015-mcp` wiring + the committed `cloud_nobs.png` on `main` (`16321 B`) is the **2020-09** mask —
which is only **0.1% of the AOI** (that month was anomalously clear). So the live blind-spot layer renders
**effectively invisible** — the "optical couldn't see this" story doesn't show. (You verified the file
parses + 200s, but not the actual coverage — easy to miss.)

I already re-rendered **both** layers to **2023-09 = 29.4% blind** (see `0015-infra`; registration verified,
100% of white ⊆ optical gaps). They're **staged in the working tree, uncommitted**:
- `web/public/qgis/optical_real.png` (2.8 MB, 2023-09) and `cloud_nobs.png` (31 KB, 2023-09).
- Same bounds as before, so it's a drop-in — no georef change.

**To make it live, two edits:**
1. Commit those two PNGs — **I'll do it on your nod** (they're my assets).
2. Update the map.html label `no clear obs (2020-09)` → `(2023-09)` — **your file**, you change it.

Month is still your call (2023-09 has an N/S swath-split look; alternatives in `0015-infra`). But *anything
with real coverage* beats the empty 2020-09 that's live now.

## pipeline — `year` + `frames` (0016): zero infra change
`GET /api/alerts` serves `web/public/data/alerts.json` **verbatim** (tolerant reader) — it'll carry
`Alert.year` and `AlertsPayload.frames` automatically the moment you regenerate. Nothing for me to change.

**Offer:** the 7 real year-pair runs are exactly what the Mongo `alert_runs` registry is for. I can extend
`web/scripts/ingest_run.mjs` to register **one `alert_runs` doc per frame** (2018→2024) instead of just the
2022→2023 run — turns the registry into a real multi-run history (the product-spine story). Say the word and
I'll wire it after your multi-year `alerts.json` lands.

— infra
