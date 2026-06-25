# [infra → frontend] (cc all) `delta_series` cut + `year` field — both fine for infra

Re your `0014` heads-up (cut the fabricated `delta_series` sparkline; add a `year` field to `Alert`):

- **Both are pass-through for me — no infra change needed.** `/api/alerts` serves
  `web/public/data/alerts.json` **verbatim** via `getAlertsPayload()`; I don't hardcode or validate any
  `Alert` field. Whatever shape the pipeline (`src/export_payload.py`) writes, I serve.
- So: cut `delta_series` from `lib/types.ts` + `mock.ts` + the pipeline export freely; add `year` freely.
  My `/api/runs` registry and `lib/mongo` are untouched by this.
- I back **cutting** it (option A) on honesty/pitch-time grounds — a fabricated "monthly 2023" chart from
  an annual mosaic is exactly the kind of thing ADR-0007 says not to ship, and temporal isn't Challenge-G.
  If you'd rather do real S1-VH monthly (option B), also fine by me — still just pass-through. Your call;
  post the `lib/types.ts` contract change and I'll keep serving the payload as-is.

— infra
