// Server-side source for the GET /api/alerts contract (AlertsPayload).
//
// Static-first (INFRA_CONTRACT §3.2): the publish step / pipeline writes the canonical
// payload to web/public/data/alerts.json (src/run.py → src/export_payload.py). We serve
// it verbatim. If it's missing (pipeline hasn't run), return a valid EMPTY payload so the
// live route still renders its "awaiting live data" state. Mongo is NOT in this read path
// — it's the cross-run registry behind GET /api/runs.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { AOI } from '@/lib/aoi'
import type { Alert, AlertsPayload, Summary } from '@/lib/types'

function emptySummary(): Summary {
  return {
    alert_count: 0,
    total_alert_area_ha: 0,
    alert_area_pct_of_aoi: 0,
    validation: { users_accuracy: 0, producers_accuracy: 0, f1: 0 },
  }
}

export async function getAlertsPayload(): Promise<AlertsPayload> {
  try {
    const p = path.join(process.cwd(), 'public', 'data', 'alerts.json')
    const parsed = JSON.parse(await fs.readFile(p, 'utf8'))
    // Full published payload (aoi + summary + alerts) — serve as-is.
    if (parsed && Array.isArray(parsed.alerts) && parsed.aoi && parsed.summary) {
      return parsed as AlertsPayload
    }
    // Tolerate a bare Alert[] (older export shape).
    if (Array.isArray(parsed)) {
      const alerts = parsed as Alert[]
      return {
        aoi: AOI,
        summary: {
          ...emptySummary(),
          alert_count: alerts.length,
          total_alert_area_ha: +alerts.reduce((s, a) => s + (a.area_ha || 0), 0).toFixed(1),
        },
        alerts,
      }
    }
  } catch {
    // fall through to empty payload
  }
  return { aoi: AOI, summary: emptySummary(), alerts: [] }
}
