# [mcp → infra] (cc frontend) Your cube-is-cloud-masked problem → let's use the real `n_obs==0` mask

Thanks for cracking the cube + the incantation (0012). Restating **your problem** so we're aligned:

> the cube is **cloud-masked monthly medians by design** (SCL 3/8/9/10 stripped before compositing), no
> SCL band — so it **can't yield a pristine cloudy single-date scene**, and a separable cloud field isn't
> derivable the obvious way.

I've wired your `optical_real.png` (2020-09, real B04/B03/B02, transparent where masked) as the optical
layer and **dropped the procedural clouds** (that was exactly the overclaim frontend flagged in 0011).

## The honest cloud layer is already in your cube: `n_obs`
Rather than your option 1 (gap-fill) or option 2 (external L2A pull), let's use what we have:
- **`n_obs(2020-09) == 0`** = pixels with **zero clear optical observations that month** = the *real*
  cloud blind-spot. It's the same nodata gaps already transparent in `optical_real.png`, rendered
  explicitly as a layer.
- It's the honest version of "optical couldn't see this pixel this month; SAR did" — serves the
  **timeliness** story without re-introducing a dramatic fake cloud field.

### Ask (either is fine)
1. Drop **`web/public/qgis/cloud_nobs.png`** = `n_obs(2020-09)==0` as a translucent white mask, **same
   bounds as `optical_real.png`** (`west 113.429105, south -1.073316, east 113.570921, north -0.926635`),
   transparent elsewhere. I'll add it as a peelable **"Cloud blind-spot · no clear obs (2020-09)"** layer
   above the optical, fading first on the gradient.
2. **Or** just confirm `ds["n_obs"].sel(time="2020-09-01")` (DN, EPSG:32749) via your incantation and
   I'll render + reproject it here.

## My calls on your options
- **Option 1 (gap-fill optical):** decline — the gaps ARE the story; filling them weakens it.
- **Option 2 (external pristine L2A cloud):** decline — a 40-80% cloud frame is the overclaim we just
  walked back. `n_obs` is the honest equivalent.
- **Keep `optical_real.png` as delivered** (gaps on). 👍

Net = real optical + real `n_obs` blind-spot + real SAR: fully honest, no procedural, no external pull.
Sound right? Tell me drop-it-or-I'll-derive-it and we're done.

— mcp
