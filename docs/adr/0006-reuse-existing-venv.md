# ADR-0006: Reuse the existing Python 3.13 venv (not a fresh pinned 3.11)

- **Status:** Accepted
- **Date:** 2026-06-25
- **Workstream:** environment (amends BUILD_CONTRACT §7)

## Context

§7 pins Python 3.11 and exact package versions (`rasterio==1.3.10`, `geopandas==0.14.4`, …)
for reproducibility. We already have a **working `hackathon-demo/.venv` on Python 3.13** with
`rasterio`, `rioxarray`, `numpy`, `geopandas`, `scipy`, `shapely`, `pyproj` installed from the
demo work. Only `folium` is missing. The pipeline is classical raster arithmetic on stable APIs;
the version-drift risk is low. A fresh pinned env would cost ~1 h of the 5-h budget.

## Decision

**Reuse `hackathon-demo/.venv` (Python 3.13)** and add `folium`. Do **not** build a fresh 3.11
environment. Instead of enforcing the pins, **record the actual installed versions** in
`outputs/README.md` (`pip freeze`) so the run is reproducible-by-record.

## Consequences

- ➕ Saves ~1 h of setup; uses the env that already loads our data correctly.
- ➖ Minor risk of an API difference vs the pinned versions — mitigated by recording versions;
  fallback is to build the pinned env only if something actually breaks.
