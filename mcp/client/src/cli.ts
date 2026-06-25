// TTC MCP client CLI.
//
//   npm run tools                      # smoke-test: list QGIS-MCP tools
//   npm run init-db                    # create through_the_clouds collections + indexes
//   npm run pipeline -- [--run-id X]   # drive ttc_full over MCP, then ingest the result
//   npm run ingest   -- [--geojson f --metrics f]   # ingest an existing alerts geojson
//
// Mongo URI comes from MONGODB_URI (e.g. `node --env-file=../../web/.env.local …`)
// or --mongo. MCP URL from MCP_URL or --mcp (default http://localhost:8100/mcp).
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TtcMcpClient } from './mcp.js'
import { ingest, initDb } from './ingest.js'
import type { RunInput } from './types.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../..')

const AOI = {
  aoiId: 'G_sar_borneo',
  aoiName: 'Central Kalimantan SAR-through-clouds hotspot',
  bbox: [113.4291, -1.0733, 113.5709, -0.9266] as [number, number, number, number],
  yearA: 2022,
  yearB: 2023,
}

// Container-side input paths (../real-data → /data/inputs) and thresholds (mirror src/config.py).
const CONTAINER = {
  palsar_a: '/data/inputs/palsar_gee/G_sar_borneo/annual/2022/palsar_G_sar_borneo_2022.tif',
  palsar_b: '/data/inputs/palsar_gee/G_sar_borneo/annual/2023/palsar_G_sar_borneo_2023.tif',
  hansen: '/data/inputs/hansen_lossyear/G_sar_borneo/hansen-lossyear_G_sar_borneo_2024.tif',
}
const THRESHOLDS = {
  delta_db: -2.5, water_db: -24.0, nonforest_db: -14.0, mmu_ha: 0.2,
  frontier_area_ha: 1.0, frontier_delta_db: -3.0, lee: 7, hansen_loss_year: 23,
}

// Python for execute_python: build the params dict in TS (full control — the vendor's
// run_recipe only substitutes $zone, so we drive the detect step directly instead).
// JSON.stringify yields a valid Python literal here (only strings + numbers, no bools).
function detectCode(runId: string): string {
  const p = { run_id: runId, ...CONTAINER, out_dir: `/data/outputs/${runId}`, ...THRESHOLDS }
  return `params = ${JSON.stringify(p)}\nexec(open('/app/ttc-config/detect.py').read())`
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function makeRunId(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, '-')
  return `${iso}__${AOI.aoiId.toLowerCase()}__${AOI.yearA}_${AOI.yearB}`
}

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO }).toString().trim()
  } catch {
    return 'uncommitted'
  }
}

function mongoUri(): string {
  const uri = arg('mongo') ?? process.env.MONGODB_URI
  if (!uri) {
    console.error('No Mongo URI. Set MONGODB_URI (e.g. --env-file=../../web/.env.local) or pass --mongo.')
    process.exit(2)
  }
  return uri
}

function runInput(runId: string): RunInput {
  return { ...AOI, runId }
}

async function cmdTools(): Promise<void> {
  const mcp = new TtcMcpClient(arg('mcp'))
  await mcp.connect()
  const tools = await mcp.listTools()
  console.log(JSON.stringify({ ok: true, count: tools.length, tools }, null, 2))
  await mcp.close()
}

async function cmdInitDb(): Promise<void> {
  await initDb(mongoUri())
  console.log(JSON.stringify({ ok: true, msg: 'through_the_clouds indexes ensured (alerts 2dsphere, alert_runs)' }))
}

async function cmdPipeline(): Promise<void> {
  const runId = arg('run-id') ?? makeRunId()
  const mcp = new TtcMcpClient(arg('mcp'))
  console.error(`· connecting MCP …`)
  await mcp.connect()

  // Best-effort canvas setup (cosmetic — detection is file-driven; ignore failures).
  try {
    await mcp.callTool('set_study_zone', { target: AOI.aoiName })
    await mcp.callTool('add_layer', { uri: CONTAINER.palsar_a, name: `PALSAR HV ${AOI.yearA}`, type: 'raster' })
    await mcp.callTool('add_layer', { uri: CONTAINER.palsar_b, name: `PALSAR HV ${AOI.yearB}`, type: 'raster' })
  } catch (e) {
    console.error(`· (canvas setup skipped: ${String(e).slice(0, 120)})`)
  }

  console.error(`· execute_python detect (run_id=${runId}) — QGIS container running detect.py …`)
  const det = await mcp.callTool('execute_python', { code: detectCode(runId) })
  await mcp.close()
  console.error(`· detect result: ${det.text.slice(0, 500)}`)

  // The container writes /data/outputs/<run_id>/ → host mcp/outputs/<run_id>/
  const outDir = path.join(REPO, 'mcp/outputs', runId)
  const geojson = path.join(outDir, 'alerts_2023.geojson')
  const metrics = path.join(outDir, 'validation_metrics.json')
  if (!existsSync(geojson)) {
    console.error(`FAILED: detect produced no geojson at ${geojson}.\nFull MCP result:\n${det.text}`)
    process.exit(1)
  }
  console.error(`· ingesting ${geojson} → Mongo …`)
  const r = await ingest(mongoUri(), geojson, metrics, runInput(runId), gitSha())
  console.log(JSON.stringify({ ok: true, source: 'qgis-mcp', ...r }, null, 2))
}

// run_recipe showcase (zone-only, per the vendor's substitution model).
async function cmdRecipe(): Promise<void> {
  const zone = arg('zone') ?? 'Central Kalimantan, Indonesia'
  const id = arg('id') ?? 'ttc_full'
  const mcp = new TtcMcpClient(arg('mcp'))
  await mcp.connect()
  const res = await mcp.runRecipe(id, { zone })
  await mcp.close()
  console.log(JSON.stringify({ ok: true, id, zone, result: res.data ?? res.text }, null, 2))
}

async function cmdIngest(): Promise<void> {
  const runId = arg('run-id') ?? makeRunId()
  const geojson = arg('geojson') ?? path.join(REPO, 'outputs/alerts/alerts_2023.geojson')
  const metrics = arg('metrics') ?? path.join(REPO, 'outputs/alerts/validation_metrics.json')
  const r = await ingest(mongoUri(), geojson, metrics, runInput(runId), gitSha())
  console.log(JSON.stringify({ ok: true, source: 'file', geojson, ...r }, null, 2))
}

// Read-only Mongo verification (uses the driver + --env-file, not mongosh).
async function cmdVerify(): Promise<void> {
  const { MongoClient } = await import('mongodb')
  const client = new MongoClient(mongoUri(), { serverSelectionTimeoutMS: 6000 })
  await client.connect()
  try {
    const db = client.db('through_the_clouds')
    const latest = (
      await db.collection('alert_runs').find({ source: 'qgis-mcp' }).sort({ created_at: -1 }).limit(1).toArray()
    )[0] as Record<string, unknown> | undefined
    const runId = latest?.run_id as string | undefined
    const hotspot = {
      type: 'Polygon',
      coordinates: [[
        [113.4291, -1.0733], [113.5709, -1.0733], [113.5709, -0.9266],
        [113.4291, -0.9266], [113.4291, -1.0733],
      ]],
    }
    const within = await db.collection('alerts').countDocuments({ geometry: { $geoWithin: { $geometry: hotspot } } })
    const sample = (await db.collection('alerts').findOne({ run_id: runId })) as Record<string, any> | null
    const idx = await db.collection('alerts').indexes()
    console.log(JSON.stringify({
      ok: true,
      alerts_total: await db.collection('alerts').countDocuments({}),
      alerts_this_run: await db.collection('alerts').countDocuments({ run_id: runId }),
      alert_runs_total: await db.collection('alert_runs').countDocuments({}),
      geo_within_hotspot_2dsphere: within,
      sample_geom: sample?.geometry?.type,
      sample_props: sample?.properties,
      sample_centroid: sample?.centroid,
      alerts_indexes: idx.map((i) => i.name),
      run_validation: latest?.validation,
      pipeline_passed: latest?.pipeline_passed,
    }, null, 2))
  } finally {
    await client.close()
  }
}

const CMDS: Record<string, () => Promise<void>> = {
  tools: cmdTools,
  'init-db': cmdInitDb,
  pipeline: cmdPipeline,
  recipe: cmdRecipe,
  ingest: cmdIngest,
  verify: cmdVerify,
}

const cmd = process.argv[2]
const fn = cmd ? CMDS[cmd] : undefined
if (!fn) {
  console.error(`usage: cli.ts <tools|init-db|pipeline|ingest> [flags]`)
  process.exit(2)
}
fn().catch((e) => {
  console.error('FAILED:', e?.stack ?? e)
  process.exit(1)
})
