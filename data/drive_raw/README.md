# AEF Embeddings

Per-pixel geospatial embeddings from the **AlphaEarth Foundation (AEF)** model, published by [The Geography of Everything (TGE)](https://source.coop/tge-labs/aef) on Source Cooperative.

## What they are

AEF embeddings are dense 64-dimensional feature vectors computed from multi-spectral satellite imagery. Each pixel is represented as a 64-float vector encoding land surface characteristics — texture, spectral signature, temporal patterns — learned from global training data. They are analogous to word embeddings but for land surface pixels.

These embeddings are general-purpose: they can be used directly as input features for classification, change detection, regression, or clustering tasks without needing to engineer spectral indices manually.

## File layout

```
aef_embeddings/
└── {aoi_id}/
    └── annual/
        └── aef_{aoi_id}_{year}.tif   (one per year, 2017–2025)
```

## File format

| Property | Value |
|---|---|
| Format | GeoTIFF |
| Bands | 64 |
| Dtype | float32 |
| Value range | [-1, 1] (dequantised from int8) |
| NoData | NaN |
| Resolution | ~10 m |
| Projection | Native UTM (varies by AOI) |
| Years | 2017–2025 |

## AOIs

| aoi_id | Location |
|---|---|
| A_koranga_forks_nz | New Zealand |
| B_grinnell_iowa | Iowa, USA |
| C_aus_dingo_fence | Australia |
| D_Chablis_Vineyard | Chablis, France |
| E_saudi_arabia_aquifer | Saudi Arabia |
| F1_coffee_leaf_rust_ethiopia | Ethiopia |
| F3_Germany_BarkBeetle | Germany |
| F4_fall_armyworm_kenya | Kenya |
| G_sar_borneo | Borneo |

## Usage example

```python
import rioxarray

emb = rioxarray.open_rasterio(
    "s3://qa-treefera-science-data/hackathons/external-june-2026/aef_embeddings/B_grinnell_iowa/annual/aef_B_grinnell_iowa_2021.tif",
    chunks={"band": 64, "x": 512, "y": 512},
)
# shape: (64, H, W) — 64 embedding dimensions per pixel
```

## Source

Original data: `s3://us-west-2.opendata.source.coop/tge-labs/aef/v1/annual/` (public, anonymous access)
