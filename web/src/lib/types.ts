// Canonical data contract shared by the demo (mock) and the live API.
// Keep this in sync with the pipeline export and the engineer's GET /api/alerts.

export type Alert = {
  id: string
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
  /** 12 monthly delta values for 2023 (illustrative until S1 sub-annual is wired) */
  delta_series: number[]
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

export type Aoi = {
  bbox: [number, number, number, number]
  name: string
  centre: [number, number]
}

/** Full payload shape for GET /api/alerts. */
export type AlertsPayload = {
  aoi: Aoi
  summary: Summary
  alerts: Alert[]
}
