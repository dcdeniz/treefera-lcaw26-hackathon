// GET /api/health — ops only (INFRA_CONTRACT §3.3). DB reachability; page always renders.
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let db: 'up' | 'down' = 'down'
  try {
    const d = await getDb()
    if (d) {
      await d.command({ ping: 1 })
      db = 'up'
    }
  } catch {
    db = 'down'
  }
  return NextResponse.json({ db, static: 'ok' })
}
