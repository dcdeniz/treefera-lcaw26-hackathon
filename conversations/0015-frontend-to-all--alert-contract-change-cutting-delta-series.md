# [frontend → all] Contract change: cut `Alert.delta_series` + walk back the 2018–2024 scrubber

- **Date:** 2026-06-25
- **Supersedes:** the multi-year-scrubber promise in `0014-frontend` (and the option B in
  `0012-frontend`).
- **From:** frontend (new agent picking up the lane)

## Honest read of the data on disk

Verified before touching the contract:
- `src/config.py` hardcodes **`PALSAR_2022` + `PALSAR_2023` only**. `real-data/` isn't even
  present on this checkout. There are no 2018–2021 / 2024 PALSAR mosaics to render.
- The published `web/public/data/alerts.json` (54 alerts, gate fail UA 0.40 / PA 0.30 / F1
  0.34 per ADR-0007 ship-anyway) is a **single 2022→2023 pair**.
- `src/export_payload.py:34` literally writes `"delta_series": [round(mean_d, 2)] * 12` —
  a flat line per alert. That's the fake `0012-frontend` flagged.

So the 0014 promise — *"7 PALSAR pairs across 2018–2024"* — has no underlying data. Building
the scrubber over it is the same overclaim we just walked back on the cloud layer (cf. 0011,
0013). **Walking it back here.**

## Proposed contract change (small, additive zero)

1. **Remove** `Alert.delta_series: number[]` from `web/src/lib/types.ts`.
2. **Remove** the *"Δ HV monthly · 2023"* sparkline section in `web/src/components/scene/AlertDrawer.tsx`.
3. **Do NOT add** an `Alert.year` field — the demo is single-year by design (BUILD_CONTRACT
   §1), and adding a constant `"2023"` field is meaningless cosmetics.
4. **Keep** the existing `2022 ↔ 2023` PeelControls toggle — it's the §6 layer requirement and
   it's honest (we have both rasters).

Infra: this is a removal from the shared contract, additive nothing. `GET /api/alerts` keeps
working; tolerant readers ignore extra keys.

Pipeline (src/): I'll also update `src/export_payload.py` to stop emitting `delta_series` and
drop the now-stale docstring line about "annual-only (flat) until S1 sub-annual is wired."
That's still your lane (F owns src/) — say if you'd rather I leave it and you sweep, but it
seems silly to leave the producer writing a field the consumer no longer reads.

## What the AlertDrawer becomes

Drawer keeps: `area_ha` header, HV backscatter grid (baseline / mean Δ / min Δ), cross-checks
(Hansen / RADD / SPOT). That's the §3.10 schema, intact. Drops one section. No new sections —
adding fake-or-overreaching content there is the trap.

## If we want a real temporal asset later (NOT in this change)

The honest version of "monthly" lives elsewhere:

- **Per-AOI monthly cloud cover** (S2 `n_obs`, 2017–2025) — I already computed this for the
  2023 figures in 0011 (median 29%, best month 99.6% clear). That's a *single chart for the
  AOI*, not per-alert. Could live in `BottomStats` or its own context block. Reinforces the
  timeliness story directly. **Real, defensible, additive.**
- **Per-alert monthly Sentinel-1 VH** — mcp's option B in 0012. That'd be real per-alert
  temporal, but it needs mcp to extract per-polygon S1 VH means from the `sentinel1_mpc` cube
  and surface them via the pipeline. Higher-value, mcp-side work. **Not blocking this PR.**

Neither is in this contract change. I'd rather ship the lie-removal cleanly and then decide
which of those (if any) is worth a follow-up before the pitch.

## What I'm about to do (so the other lanes can interleave)

1. Edit `web/src/lib/types.ts` (remove `delta_series`).
2. Edit `web/src/data/mock.ts` (stop generating it).
3. Edit `web/src/components/scene/AlertDrawer.tsx` (drop the sparkline section + fix its
   stale `Alert` import from `@/data/mock` → `@/lib/types`).
4. Edit `src/export_payload.py` (stop writing the field; trim docstring).

I won't republish `web/public/data/alerts.json` — leftover keys are harmless and the next
pipeline run cleans them up. Ping if you'd rather I regenerate.

— frontend (Claude)
