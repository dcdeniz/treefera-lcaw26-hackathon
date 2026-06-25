// Through-the-Clouds product-spine REST API.
//
// Serves the run registry + geospatial alerts from the EXISTING `through_the_clouds`
// Mongo (alert_runs + the per-feature `alerts` 2dsphere collection the ingester writes).
// This is the "what this becomes" product surface (cross-AOI history, $geoWithin
// queries). It is a LOCAL-DEV showcase and deliberately does NOT replace the Next.js
// static-first demo path (`/api/alerts` → public/data/alerts.json); INFRA_CONTRACT §1.3
// stays intact.
//
//   node --env-file=../../web/.env.local --import tsx src/server.ts   (or: npm run start)
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import { MongoClient, type Db } from 'mongodb'

const DB_NAME = 'through_the_clouds'
const PORT = Number(process.env.PORT ?? 4000)
const URI = process.env.MONGODB_URI

// Cache the client AND the connect promise (Vercel/Next pattern): concurrent cold
// requests share one connect; on failure we close + reset so the next request retries
// (and we don't leak the failed client's pool). _client is kept for graceful shutdown.
let _client: MongoClient | null = null
let _clientPromise: Promise<MongoClient> | null = null

async function getDb(): Promise<Db | null> {
  if (!URI) return null
  try {
    if (!_clientPromise) {
      _client = new MongoClient(URI, { serverSelectionTimeoutMS: 4000 })
      _clientPromise = _client.connect()
    }
    const client = await _clientPromise
    return client.db(DB_NAME)
  } catch (err) {
    console.error(JSON.stringify({ scope: 'mongo', ok: false, err: String(err) }))
    try {
      await _client?.close()
    } catch {
      /* ignore */
    }
    _client = null
    _clientPromise = null
    return null
  }
}

interface AlertDoc {
  run_id: string
  feature_id: string
  geometry: unknown
  properties: Record<string, unknown>
}

function toFeatureCollection(docs: AlertDoc[]) {
  return {
    type: 'FeatureCollection',
    features: docs.map((d) => ({
      type: 'Feature',
      id: d.feature_id,
      properties: { ...d.properties, run_id: d.run_id, feature_id: d.feature_id },
      geometry: d.geometry,
    })),
  }
}

const log = (route: string, t0: number, ok: boolean) =>
  console.log(JSON.stringify({ route, ms: Date.now() - t0, ok }))

const app = express()
app.use(cors())

app.get('/api/health', async (_req: Request, res: Response) => {
  const t0 = Date.now()
  const db = await getDb()
  let dbUp = false
  try {
    if (db) {
      await db.command({ ping: 1 })
      dbUp = true
    }
  } catch {
    dbUp = false
  }
  log('/api/health', t0, true)
  res.json({ ok: true, db: dbUp ? 'up' : 'down' })
})

app.get('/api/aois', async (_req, res) => {
  const t0 = Date.now()
  const db = await getDb()
  if (!db) return res.json([])
  const aois = await db.collection('aois').find({}).toArray()
  log('/api/aois', t0, true)
  res.json(aois)
})

app.get('/api/runs', async (req, res) => {
  const t0 = Date.now()
  const db = await getDb()
  if (!db) return res.json([])
  const aoiId = req.query.aoi_id as string | undefined
  const q = aoiId ? { aoi_id: aoiId } : {}
  const runs = await db
    .collection('alert_runs')
    .find(q)
    .sort({ created_at: -1 })
    .limit(20)
    .toArray()
  log('/api/runs', t0, true)
  res.json(runs)
})

app.get('/api/runs/:run_id', async (req, res) => {
  const t0 = Date.now()
  const db = await getDb()
  if (!db) return res.status(503).json({ error: 'db unavailable' })
  const run = await db.collection('alert_runs').findOne({ run_id: req.params.run_id })
  log('/api/runs/:id', t0, !!run)
  if (!run) return res.status(404).json({ error: 'not found' })
  res.json(run)
})

app.get('/api/runs/:run_id/alerts', async (req, res) => {
  const t0 = Date.now()
  const db = await getDb()
  if (!db) return res.json({ type: 'FeatureCollection', features: [] })
  const docs = (await db
    .collection('alerts')
    .find({ run_id: req.params.run_id })
    .limit(5000)
    .toArray()) as unknown as AlertDoc[]
  log('/api/runs/:id/alerts', t0, true)
  res.json(toFeatureCollection(docs))
})

app.get('/api/alerts', async (req, res) => {
  const t0 = Date.now()
  const db = await getDb()
  if (!db) return res.json({ type: 'FeatureCollection', features: [] })
  const filter: Record<string, unknown> = {}
  if (req.query.run_id) filter.run_id = req.query.run_id
  const bbox = (req.query.bbox as string | undefined)?.split(',').map(Number)
  if (bbox && bbox.length === 4 && bbox.every((n) => Number.isFinite(n))) {
    const [minLng, minLat, maxLng, maxLat] = bbox
    // CCW exterior ring (RFC 7946 right-hand rule): BL→BR→TR→TL→BL — positive shoelace
    // area == CCW, so 2dsphere treats this as the box interior (not its complement).
    filter.geometry = {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[
            [minLng, minLat], [maxLng, minLat], [maxLng, maxLat],
            [minLng, maxLat], [minLng, minLat],
          ]],
        },
      },
    }
  }
  const docs = (await db.collection('alerts').find(filter).limit(5000).toArray()) as unknown as AlertDoc[]
  log('/api/alerts', t0, true)
  res.json(toFeatureCollection(docs))
})

app.get('/api/alerts/frontier', async (req, res) => {
  const t0 = Date.now()
  const db = await getDb()
  if (!db) return res.json({ type: 'FeatureCollection', features: [] })
  const filter: Record<string, unknown> = { 'properties.candidate_plantation_frontier': true }
  if (req.query.run_id) filter.run_id = req.query.run_id
  const docs = (await db.collection('alerts').find(filter).limit(5000).toArray()) as unknown as AlertDoc[]
  log('/api/alerts/frontier', t0, true)
  res.json(toFeatureCollection(docs))
})

const server = app.listen(PORT, () => {
  console.log(JSON.stringify({ ok: true, msg: `TTC API on :${PORT}`, db: URI ? 'configured' : 'NO MONGODB_URI' }))
})

async function shutdown(sig: string): Promise<void> {
  console.log(JSON.stringify({ ok: true, msg: `shutdown (${sig})` }))
  server.close()
  try {
    await _client?.close()
  } catch {
    /* ignore */
  }
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
