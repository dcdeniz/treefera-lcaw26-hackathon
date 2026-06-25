// Offline publish-step ingest (INFRA_CONTRACT §4.5 step 6 / §7 step 7).
// Registers the latest pipeline run into Mongo `alert_runs` (the durable run registry)
// and syncs the `aois` doc bbox to the published payload. The pipeline itself never
// touches Mongo — this keeps the DB out of the demo's critical path (§1.2).
//
//   node --env-file=web/.env.local web/scripts/ingest_run.mjs
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { MongoClient } from 'mongodb'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const AOI_ID = 'G_sar_borneo'

// Tunables — mirror src/config.py (BUILD_CONTRACT §3; F owns these).
const thresholds = {
  hv_loss_db: -2.5, water_db: -24.0, nonforest_db: -14.0,
  mmu_ha: 0.2, frontier_area_ha: 1.0, frontier_delta_db: -3.0,
}

const read = async (rel) => JSON.parse(await fs.readFile(path.join(REPO, rel), 'utf8'))

async function main() {
  const payload = await read('web/public/data/alerts.json')
  const metrics = await read('outputs/alerts/validation_metrics.json')
  let git_sha = 'uncommitted'
  try { git_sha = execSync('git rev-parse HEAD', { cwd: REPO }).toString().trim() } catch {}

  // §6.1 demo gate (honest — this run does NOT pass; we ship caveated, ADR-0007).
  const pipeline_passed =
    metrics.users_accuracy >= 0.75 && metrics.producers_accuracy >= 0.65 &&
    metrics.f1 >= 0.70 && metrics.alert_area_pct_of_aoi >= 0.2 && metrics.alert_area_pct_of_aoi <= 8

  const run = {
    aoi_id: AOI_ID,
    year_pair: [2022, 2023],
    thresholds,
    metrics, // full object verbatim — no data invented (UA/PA/F1/area + tp/fp/fn/hansen/object-precision)
    summary: payload.summary,
    artifact_uris: {
      alerts_payload: '/data/alerts.json',          // web-served (CDN)
      source_geojson: 'outputs/alerts/alerts_2023.geojson',
      source_metrics: 'outputs/alerts/validation_metrics.json',
    },
    git_sha,
    pipeline_passed,
    created_at: new Date(),
  }

  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 })
  await client.connect()
  const db = client.db('through_the_clouds')

  // Sync the AOI registry bbox/centre to the published payload (frontend 0004 §⚠️1).
  await db.collection('aois').updateOne(
    { _id: AOI_ID },
    { $set: { bbox: payload.aoi.bbox, name: payload.aoi.name, centre: payload.aoi.centre } },
  )

  // Idempotent per (aoi, git_sha): re-running the same commit won't pile up dupes.
  await db.collection('alert_runs').replaceOne({ aoi_id: AOI_ID, git_sha }, run, { upsert: true })

  const count = await db.collection('alert_runs').countDocuments({ aoi_id: AOI_ID })
  console.log(JSON.stringify({
    ok: true, aoi_id: AOI_ID, git_sha, pipeline_passed,
    alert_count: payload.summary.alert_count,
    f1: metrics.f1, alert_runs_total: count,
  }))
  await client.close()
}

main().catch((e) => { console.error('ingest failed:', e); process.exit(1) })
