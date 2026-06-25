// Shared types for the TTC MCP client + Mongo ingester.

export interface PolygonGeometry {
  type: 'Polygon'
  coordinates: number[][][]
}
export interface PointGeometry {
  type: 'Point'
  coordinates: [number, number]
}
export interface GeoFeature {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: PolygonGeometry
}
export interface FeatureCollection {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

/** Per-feature properties emitted by detect.py (BUILD_CONTRACT §3.10). */
export interface AlertProps {
  n_px?: number
  area_ha: number
  mean_delta_hv_db: number
  min_delta_hv_db: number
  baseline_hv_db: number
  candidate_plantation_frontier: boolean
  hansen_gfc_2023: boolean
}

/** A per-feature document in the `alerts` collection (INFRA_CONTRACT §2.3 Option B). */
export interface AlertDoc {
  run_id: string
  aoi_id: string
  feature_id: string
  geometry: PolygonGeometry // EPSG:4326, 2dsphere-indexed
  centroid: PointGeometry // 2dsphere-indexed
  properties: AlertProps & {
    cross_checks: { hansen_gfc_2023: boolean; radd_2023: boolean; spot_visual: string }
  }
  created_at: Date
}

export interface RunInput {
  aoiId: string
  aoiName: string
  bbox: [number, number, number, number]
  yearA: number
  yearB: number
  runId: string
}

/** Validation metrics emitted by detect.py / validate step. */
export interface Metrics {
  users_accuracy: number
  producers_accuracy: number
  f1: number
  alert_area_pct_of_aoi: number
  object_precision_vs_hansen?: number
  [k: string]: unknown
}
