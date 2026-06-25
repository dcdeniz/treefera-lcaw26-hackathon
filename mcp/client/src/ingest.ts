// Mongo ingester — writes alerts into the EXISTING `through_the_clouds` database.
//
// Reconciliation (see mcp/README.md §ADRs): the PR-#4 handoff proposed a NEW `ttc`
// db with `ttc_runs`/`ttc_alerts`. That would fragment the schema the infra agent
// already seeded (conv 0005). Instead we reuse `through_the_clouds` and ADD the
// per-feature `alerts` collection (INFRA_CONTRACT §2.3 Option B), keeping `alert_runs`
// as the run registry the Next /api/runs + frontend already read.
import { promises as fs } from 'node:fs'
import { MongoClient, type Db } from 'mongodb'
import type { AlertDoc, FeatureCollection, GeoFeature, Metrics, RunInput } from './types.js'

export const DB_NAME = 'through_the_clouds'

// ── §4.4 demo gate (honest; this run does NOT pass — ship caveated, ADR-0007) ──
export function pipelinePassed(m: Metrics): boolean {
  return (
    m.users_accuracy >= 0.75 &&
    m.producers_accuracy >= 0.65 &&
    m.f1 >= 0.7 &&
    m.alert_area_pct_of_aoi >= 0.2 &&
    m.alert_area_pct_of_aoi <= 8
  )
}

export async function ensureIndexes(db: Db): Promise<void> {
  const alerts = db.collection('alerts')
  await alerts.createIndex({ geometry: '2dsphere' })
  await alerts.createIndex({ centroid: '2dsphere' })
  await alerts.createIndex({ run_id: 1, 'properties.candidate_plantation_frontier': 1 })
  await alerts.createIndex({ aoi_id: 1 })
  const runs = db.collection('alert_runs')
  await runs.createIndex({ aoi_id: 1, created_at: -1 })
  await runs.createIndex({ run_id: 1 }, { unique: true, sparse: true })
}

// ── EUDR-shape enforcement (handoff §7.2 / ADR-006) ───────────────────────────
const MIN_RING_VERTICES = 4 // a closed triangle

function closeRing(ring: number[][]): number[][] {
  const a = ring[0]
  const z = ring[ring.length - 1]
  if (a && z && (a[0] !== z[0] || a[1] !== z[1])) ring.push([a[0], a[1]])
  return ring
}

function exteriorCentroid(ring: number[][]): [number, number] {
  // Shoelace polygon centroid (falls back to vertex mean for degenerate rings).
  let x = 0
  let y = 0
  let a = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[i + 1]
    const cross = x0 * y1 - x1 * y0
    a += cross
    x += (x0 + x1) * cross
    y += (y0 + y1) * cross
  }
  if (Math.abs(a) < 1e-12) {
    const n = ring.length - 1 || 1
    const mx = ring.slice(0, n).reduce((s, p) => s + p[0], 0) / n
    const my = ring.slice(0, n).reduce((s, p) => s + p[1], 0) / n
    return [round6(mx), round6(my)]
  }
  a *= 0.5
  return [round6(x / (6 * a)), round6(y / (6 * a))]
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6
}

function inWgs84(ring: number[][]): boolean {
  return ring.every(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90)
}

function toAlertDoc(f: GeoFeature, runId: string, aoiId: string, i: number): AlertDoc | null {
  if (f.geometry?.type !== 'Polygon' || !Array.isArray(f.geometry.coordinates)) return null
  const rings = f.geometry.coordinates.map((r) => closeRing(r.map(([x, y]) => [x, y])))
  const ext = rings[0]
  if (!ext || ext.length < MIN_RING_VERTICES || !inWgs84(ext)) return null
  const p = f.properties as Record<string, unknown>
  return {
    run_id: runId,
    aoi_id: aoiId,
    feature_id: `a_${String(i + 1).padStart(4, '0')}`,
    geometry: { type: 'Polygon', coordinates: rings },
    centroid: { type: 'Point', coordinates: exteriorCentroid(ext) },
    properties: {
      area_ha: Number(p.area_ha ?? 0),
      mean_delta_hv_db: Number(p.mean_delta_hv_db ?? 0),
      min_delta_hv_db: Number(p.min_delta_hv_db ?? 0),
      baseline_hv_db: Number(p.baseline_hv_db ?? 0),
      candidate_plantation_frontier: Boolean(p.candidate_plantation_frontier),
      hansen_gfc_2023: Boolean(p.hansen_gfc_2023),
      cross_checks: {
        hansen_gfc_2023: Boolean(p.hansen_gfc_2023),
        radd_2023: false, // no local RADD (EE fallback only)
        spot_visual: 'unclear', // SPOT not auto-labelled (handoff §13.4)
      },
    },
    created_at: new Date(),
  }
}

export interface IngestResult {
  runId: string
  alertsInserted: number
  alertsSkipped: number
  pipelinePassed: boolean
  alertRunsTotal: number
}

export async function ingest(
  mongoUri: string,
  geojsonPath: string,
  metricsPath: string,
  input: RunInput,
  gitSha = 'uncommitted',
): Promise<IngestResult> {
  const fc = JSON.parse(await fs.readFile(geojsonPath, 'utf8')) as FeatureCollection
  const metrics = JSON.parse(await fs.readFile(metricsPath, 'utf8')) as Metrics

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 6000 })
  await client.connect()
  try {
    const db = client.db(DB_NAME)
    await ensureIndexes(db)

    const docs: AlertDoc[] = []
    let skipped = 0
    fc.features.forEach((f, i) => {
      const d = toAlertDoc(f, input.runId, input.aoiId, i)
      if (d) docs.push(d)
      else skipped++
    })

    // Idempotent per run_id: clear prior features for this run, then insert.
    await db.collection('alerts').deleteMany({ run_id: input.runId })
    if (docs.length) await db.collection('alerts').insertMany(docs)

    const passed = pipelinePassed(metrics)
    const totalAreaHa = Math.round(docs.reduce((s, d) => s + d.properties.area_ha, 0) * 1000) / 1000
    const run = {
      run_id: input.runId,
      aoi_id: input.aoiId,
      aoi_name: input.aoiName,
      aoi_bbox: input.bbox,
      year_pair: [input.yearA, input.yearB],
      status: 'success',
      alerts_count: docs.length,
      total_alert_area_ha: totalAreaHa,
      alert_area_pct_of_aoi: metrics.alert_area_pct_of_aoi,
      thresholds: {
        hv_loss_db: -2.5, water_db: -24.0, nonforest_db: -14.0,
        mmu_ha: 0.2, frontier_area_ha: 1.0, frontier_delta_db: -3.0,
      },
      metrics, // verbatim — no data invented
      validation: {
        users_accuracy: metrics.users_accuracy,
        producers_accuracy: metrics.producers_accuracy,
        f1: metrics.f1,
        alert_area_pct_of_aoi: metrics.alert_area_pct_of_aoi,
        object_precision_vs_hansen: metrics.object_precision_vs_hansen ?? null,
        pass: passed,
      },
      source: 'qgis-mcp', // distinguishes from the Python publish-step ingest
      // git_sha lives UNDER provenance (not top-level) so the web ingester's
      // replaceOne({ aoi_id, git_sha }) can never match/clobber an MCP run doc even
      // when both run at the same commit. MCP docs are keyed solely by run_id.
      provenance: { tool: 'qgis-mcp', git_sha: gitSha },
      pipeline_passed: passed,
      created_at: new Date(),
    }
    await db.collection('alert_runs').replaceOne({ run_id: input.runId }, run, { upsert: true })

    // Keep the aois registry bbox in sync with the hotspot (conv 0004 ⚠️1).
    await db.collection<{ _id: string; bbox?: number[]; name?: string }>('aois').updateOne(
      { _id: input.aoiId },
      { $set: { bbox: input.bbox, name: input.aoiName } },
      { upsert: false },
    )

    const alertRunsTotal = await db.collection('alert_runs').countDocuments({ aoi_id: input.aoiId })
    return {
      runId: input.runId,
      alertsInserted: docs.length,
      alertsSkipped: skipped,
      pipelinePassed: passed,
      alertRunsTotal,
    }
  } finally {
    await client.close()
  }
}

export async function initDb(mongoUri: string): Promise<void> {
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 6000 })
  await client.connect()
  try {
    await ensureIndexes(client.db(DB_NAME))
  } finally {
    await client.close()
  }
}
