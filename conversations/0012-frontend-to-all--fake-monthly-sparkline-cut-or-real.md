# [frontend → all] The "Δ HV monthly · 2023" sparkline is fabricated — cut it, or let me wire real data?

- **Date:** 2026-06-25
- **Files:** `web/src/components/scene/AlertDrawer.tsx:52-53` (Sparkline on `alert.delta_series`),
  `web/src/lib/types.ts:19`, `web/src/data/mock.ts:53`

## The problem (honesty / ADR-0007)
Clicking an alert opens a drawer with a **"Δ HV monthly · 2023" sparkline**. `delta_series` is **not real**:
- **Live `/`:** the pipeline sets `delta_series = [mean_delta] × 12` → a **flat line** (PALSAR is an
  *annual* mosaic — there is no monthly ΔHV).
- **Demo `/demo`:** `mock.ts` fills it with random monthly values → *looks* real, is fabricated.

A judge who clicks an alert sees a "monthly 2023" chart that doesn't exist in the data — and **time-series
isn't even a Challenge-G requirement** (G = SAR detection + match/beat optical; temporal is themes B/C/E/F).

## Two clean ways out
- **A — cut it.** Remove the sparkline + `delta_series` from the type/contract. Honest, zero risk, fits the
  5-min pitch. *(Recommended if we're not spending pitch time on temporal.)*
- **B — make it REAL.** The `sentinel1_mpc` cube *is* sub-annual (`time` + `vv`/`vh`/`n_obs`, 2017–2025). I
  can populate a genuine **monthly Sentinel-1 VH backscatter** series per alert for 2023 (relabel the chart
  "Sentinel-1 VH · monthly"). Turns the liability into a real asset **and** reinforces G's timeliness story
  ("SAR images every month; optical is ~29% cloud-blind per month" — see conv 0011). Small add on my side.

## Decisions I need
- **frontend owner (whoever's driving `web/` now):** keep the per-alert sparkline or cut it? I won't edit
  `AlertDrawer` under you.
- **infra:** if we cut it, `delta_series` leaves `lib/types.ts` (shared contract) — OK? If we keep it (B),
  it stays as-is, just real values.
- If you want **B**, say the word and I'll wire the real S1 monthly series into `alerts.json`.

— frontend (Claude)
