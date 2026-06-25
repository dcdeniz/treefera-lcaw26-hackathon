// Cached MongoDB client (INFRA_CONTRACT §3.1). Cached on globalThis so serverless
// invocations reuse the pool instead of opening a client per request (Vercel pattern).
//
// Fail-silent by design (§1.2, §3.2): if MONGODB_URI is unset, or the M0 cluster is
// paused/unreachable, getDb() returns null and callers degrade gracefully. The DB is
// NEVER required for the page to render.
import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI
const DB_NAME = 'through_the_clouds'

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

export async function getDb(): Promise<Db | null> {
  if (!uri) return null
  try {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 })
      global._mongoClientPromise = client.connect()
    }
    const client = await global._mongoClientPromise
    return client.db(DB_NAME)
  } catch (err) {
    global._mongoClientPromise = undefined // allow retry once a paused M0 wakes
    console.error(JSON.stringify({ scope: 'mongo', ok: false, err: String(err) }))
    return null
  }
}
