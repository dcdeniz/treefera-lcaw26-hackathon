// Canonical data contract shared by the demo (mock) and the live API.
// Keep in sync with the pipeline export (src/) and GET /api/alerts.

export type Alert = {
  id: string
  /** loss year of this alert's frame (e.g. 2023) — drives the multi-year scrubber */
  year: number
  /** x, y in AOI-normalised [0,1] space (for the isometric layout) */
  centroid: [number, number]
  area_ha: number
  mean_delta_hv_db: number
  min_delta_hv_db: number
  baseline_hv_db: number
  candidate_plantation_frontier: boolean
  cross_checks: {
    hansen_gfc_2023: boolean
    radd_2023: boolean
    spot_visual: 'forest' | 'cleared' | 'unclear'
  }
}

export type Summary = {
  alert_count: number
  total_alert_area_ha: number
  alert_area_pct_of_aoi: number
  validation: {
    users_accuracy: number
    producers_accuracy: number
    f1: number
  }
}

/** One year-frame in the multi-year scrubber (loss detected for `year` vs the prior year). */
export type Frame = Summary & {
  year: number
  object_precision_vs_hansen?: number
}

export type Aoi = {
  bbox: [number, number, number, number]
  name: string
  centre: [number, number]
}

/** Full payload for GET /api/alerts. `alerts` spans all years (filter by `alert.year`);
 *  `frames` is the per-year timeline; `summary` defaults to `default_year`. */
export type AlertsPayload = {
  aoi: Aoi
  summary: Summary
  alerts: Alert[]
  frames?: Frame[]
  default_year?: number
  year_range?: [number, number]
}
