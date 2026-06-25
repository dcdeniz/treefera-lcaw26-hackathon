import type { Alert, Summary } from '@/lib/types'
import { AOI } from '@/lib/aoi'

// Re-export the canonical type so scene components importing `Alert` from here
// keep working; the source of truth is @/lib/types.
export type { Alert } from '@/lib/types'

// AOI is real config (not mock); surfaced here for the /demo route's convenience.
export const aoi = AOI

export const summary: Summary = {
  alert_count: 142,
  total_alert_area_ha: 318.6,
  alert_area_pct_of_aoi: 1.4,
  validation: {
    users_accuracy: 0.81,
    producers_accuracy: 0.72,
    f1: 0.76,
  },
}

// Seeded pseudo-random so the layout is stable between renders.
function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function makeAlerts(n: number): Alert[] {
  const r = rand(7)
  const out: Alert[] = []
  for (let i = 0; i < n; i++) {
    const area = +(0.2 + r() * 18).toFixed(1)
    const mean_d = +(-1.5 - r() * 5).toFixed(2)
    const min_d = +(mean_d - r() * 2).toFixed(2)
    const baseline = +(-9 - r() * 4).toFixed(2)
    const frontier = area >= 1.0 && mean_d <= -3.0
    out.push({
      id: `a_${String(i + 1).padStart(4, '0')}`,
      centroid: [r(), r()],
      area_ha: area,
      mean_delta_hv_db: mean_d,
      min_delta_hv_db: min_d,
      baseline_hv_db: baseline,
      candidate_plantation_frontier: frontier,
      year: 2018 + (i % 7),
      cross_checks: {
        hansen_gfc_2023: r() > 0.25,
        radd_2023: r() > 0.4,
        spot_visual: r() > 0.6 ? 'forest' : r() > 0.3 ? 'cleared' : 'unclear',
      },
    })
  }
  return out
}

export const alerts: Alert[] = makeAlerts(64)
