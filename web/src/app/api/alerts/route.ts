// GET /api/alerts → AlertsPayload (the contract from conversations/0001-frontend...).
// Always 200 with a valid payload (empty until the pipeline lands), never 500, so the
// live route can render unconditionally.
import { NextResponse } from 'next/server'
import { getAlertsPayload } from '@/lib/alerts'

export const runtime = 'nodejs' // Mongo driver needs Node APIs, not Edge.
export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await getAlertsPayload()
  return NextResponse.json(payload)
}
