// /api/runs — the product-spine run registry (INFRA_CONTRACT §2.2, §3.3).
//   GET  ?aoi_id=  → alert_runs newest-first (fail-silent → [])
//   POST           → insert one alert_runs doc; write path, INGEST_TOKEN-gated.
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json([])
    const { searchParams } = new URL(request.url)
    const aoi_id = searchParams.get('aoi_id')
    const query = aoi_id ? { aoi_id } : {}
    const runs = await db
      .collection('alert_runs')
      .find(query)
      .sort({ created_at: -1 })
      .limit(100)
      .toArray()
    return NextResponse.json(runs)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  const token = request.headers.get('x-ingest-token')
  if (!process.env.INGEST_TOKEN || token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 })
    const doc = await request.json()
    doc.created_at = doc.created_at ? new Date(doc.created_at) : new Date()
    const res = await db.collection('alert_runs').insertOne(doc)
    return NextResponse.json({ _id: res.insertedId }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
