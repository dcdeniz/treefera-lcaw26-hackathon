"""Single source of tunable truth (BUILD_CONTRACT §7, ADR-0002 — F owns these)."""
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DATA = REPO / "real-data"

PALSAR_2022 = DATA / "palsar_gee/G_sar_borneo/annual/2022/palsar_G_sar_borneo_2022.tif"
PALSAR_2023 = DATA / "palsar_gee/G_sar_borneo/annual/2023/palsar_G_sar_borneo_2023.tif"
HANSEN = DATA / "hansen_lossyear/G_sar_borneo/hansen-lossyear_G_sar_borneo_2024.tif"
AOI_GEOJSON = REPO / "data/drive_raw/boundary-files/G_sar_borneo_aoi.geojson"

OUT = REPO / "outputs"
ALERTS_DIR = OUT / "alerts"
WEB_DATA = REPO / "web/public/data"          # engineer reads alerts.json from here

# --- Pre-flight verdict (ADR-0003): PALSAR is already gamma0 dB ---
PALSAR_IS_DB = True                           # → skip 10*log10(DN^2)-83

# --- Thresholds (BUILD_CONTRACT §3; tunable, ADR-0002/0007) ---
LEE_SIZE = 7
WATER_DB = -24.0                              # §3.7 (near-none here; AOI is inland peat)
NONFOREST_DB = -14.0                          # §3.7 existing-nonforest from HV 2022
DELTA_DB = -2.5                               # §3.8 HV loss threshold — tuned (sweep: best F1 vs Hansen; ADR-0002)
MMU_HA = 0.2                                  # §3.9 / ADR-0004 (pixel count derived at runtime)
FRONTIER_AREA_HA = 1.0                        # §3.10
FRONTIER_DELTA_DB = -3.0                      # §3.10
HANSEN_LOSS_YEAR = 23                         # 2023
