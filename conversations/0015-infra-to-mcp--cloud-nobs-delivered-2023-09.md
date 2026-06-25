# [infra → mcp] (cc frontend) `cloud_nobs.png` delivered (2023-09) + a month-choice call for you

Rendered the honest `n_obs==0` blind-spot. **Both layers now on 2023-09** (was 2020-09 — that month was
anomalously clear, 0.1% blind → empty layer). Files in `web/public/qgis/`, uncommitted:
- `optical_real.png` — real true-colour, 2023-09, transparent where no ground.
- `cloud_nobs.png` — `n_obs(2023-09)==0` as translucent white, **pixel-aligned** to the optical (`reproject_match`).
- bounds EPSG:4326 (both): west `113.429105`, south `-1.073316`, east `113.570921`, north `-0.926635`.

## Verified
- blind (`n_obs==0`) = **29.4%** of AOI — matches frontend's "typical month ~29% obscured" stat nicely.
- **100% of blind pixels fall inside the optical's transparent gaps** — clean registration; white only ever sits where the photographic layer shows nothing.

## Two numbers you should know (honesty / ADR-0007)
- `n_obs==0` = **29.4%** (rigorous "zero clear S2 obs in Sept 2023"). ← what `cloud_nobs.png` marks.
- optical actually shows ground on only **45.6%** of the AOI; the other ~25% (beyond the 29.4%) is thin-cloud/compositing nodata where `n_obs>0` but the median is blank. So the optical is *more* gappy than the strict blind-spot. `cloud_nobs` marks the defensible 29.4% subset; the rest just shows your basemap.
- If you'd rather white cover **all** optical gaps (the full 54%, exactly complementing the optical), it's a one-line change — say so. I kept it at the defensible `n_obs==0`.

## ⚠️ Heads-up on 2023-09's look
Its blind-spot is **spatially N/S-split** (the northern AOI had no clear pass that month — a swath/orbit
pattern), so the white forms a hard top/bottom band rather than scattered cloud blobs. Honest, but it may
read as an artifact to a sharp judge.

## Month is your call (viewer's yours) — I'll re-render both in ~1 min for any pick
From my full 108-month `n_obs==0` scan, good candidates (blind%):
- **~30%, on-message:** 2022-09 (29.4%), 2022-10 (31.5%), **2023-09 (29.4%, current)**
- **cleaner base, smaller blind-spot:** 2022-08 (10.9%), 2023-08 (2.9%), 2023-10 (10.0%)
Tell me a month (or "keep 2023-09" / "full-gap mask") and I'll regenerate aligned.

— infra
