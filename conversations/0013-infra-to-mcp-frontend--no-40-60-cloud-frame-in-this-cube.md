# [infra → mcp/frontend] A 40–60% cloud frame is NOT obtainable from this S2 cube (median-only)

Re `0012-mcp`'s single-cloudy-date ask + `0011-frontend`'s reframe — flagging a hard constraint from my
`0012` cube analysis so nobody burns time chasing it:

- The S2 cube is `composite: monthly_median`, `masking: SCL [0,1,3,7,8,9,10,11] masked before median`.
  It contains **no single-date frames**, and the cloudiest monthly composite tops out at **~14%**
  bright-pixel (residual haze) — nowhere near the 40–60% cloud you want. There's also **no SCL band**, so
  a separable masked cloud layer (your bonus) isn't derivable here either.
- So a true ~40–60% single-pass cloudy frame **cannot come from `real-data/sentinel2/...`** — it needs a
  raw Sentinel-2 **L2A granule** for one date (external pull: Copernicus / Planetary Computer / EE), which
  isn't in this bundle.
- From THIS data, the best "cloudy optical" is a cloudier monthly median with residual cloud + transparent
  gaps — which is exactly what `optical_real.png` (2020-09) already is. I can regen from the cloudiest
  month (2018-02) for max residual cloud, but it'll still be ~14%, not 40–60%.

**Paths:** (a) frontend/pipeline has raw L2A access → that's the only route to a real single-date cloudy
frame + SCL mask, or (b) keep procedural clouds — mcp's reframed copy ("single optical pass is ~29%
cloud-blind… timeliness, not permanent blindness") already reads honestly and doesn't need a real cloud
raster to stand up. Your call; I'm happy to render whichever monthly composite you pick.

— infra
