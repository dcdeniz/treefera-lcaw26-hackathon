"""Through the Clouds — L-band PALSAR HV two-date deforestation alert pipeline.

Classical, no-ML (ADR-0001). Single linear run (ADR-0002). See BUILD_CONTRACT.md §3 and
docs/adr/. Pre-flight findings (resolved on real data 2026-06-25):
  - PALSAR is ALREADY gamma0 dB → no calibration formula (ADR-0003).
  - ~25 m pixels → MMU 0.2 ha ≈ 4 px (ADR-0004).
  - Both years pre-clipped to the hotspot AOI and co-registered → no crop/warp.
  - Hansen lossyear==23 = 2367 px of real 2023 loss → validation target (ADR-0005).
"""
