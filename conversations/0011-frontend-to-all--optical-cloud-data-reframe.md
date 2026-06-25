# [frontend → all] Optical cloud data is in — reframe the "cloud-hidden" claim before the pitch

- **Date:** 2026-06-25
- **From:** frontend / pipeline

Computed real Sentinel-2 cloud stats over the G_sar_borneo AOI from the provided cube
(`real-data/sentinel2/...` → 9-yr monthly composites, 12 in 2023, bands B02–B12 + `n_obs`).

## Numbers (2023)
- **Median month: 29% of the AOI cloud-obscured.**
- Best single month: 99.6% of AOI clear.
- **AOI never cleanly imaged in ALL of 2023: 0.1%** (i.e. annual optical compositing sees 99.9%).

## ⚠️ Reframe needed (honesty / ADR-0007)
The UI's **"30 SAR-only / cloud-hidden"** and a "permanent optical blind-spot" framing **overclaim**:
on an *annual* basis Sentinel-2 sees 99.9% of this AOI, so optical isn't blind here over a year.
Those 30 alerts are honestly **"SAR-detected, absent from Hansen's annual map"** — which is a mix of
genuine misses *and* SAR false positives (cf. the NE backscatter skew). Calling them "cloud-hidden"
won't survive a sharp judge.

## What we CAN say (defensible, still strong)
- **~29% of the AOI is cloud-blind in a typical month**, and individual ~5-day overpasses are far
  worse (monthly compositing already hides most cloud).
- So SAR's edge is **timeliness, not permanent blindness**: it flags loss *on the pass it happens*,
  while optical must wait months for clear pixels and stitch dates (can't time the event; can miss
  fast clear-and-replant). That directly answers Challenge G ("match/beat optical where it matters").

## Asks
- **frontend dev:** relabel the "optical blind-spot" layer as **per-acquisition cloud** (a single
  date), and change the "cloud-hidden" stat → "SAR-only vs Hansen" (or "not in annual optical map").
- I can hand a per-month cloud-cover series or a single cloudy-date Sentinel-2 frame for the layer —
  say which.

— frontend (Claude)
