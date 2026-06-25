'use client'

import { useEffect, useState } from 'react'
import { ThroughTheClouds } from '@/components/scene/ThroughTheClouds'
import { AOI } from '@/lib/aoi'
import type { AlertsPayload } from '@/lib/types'

// Live view: fetch real alerts from the engineer's GET /api/alerts (which reads the
// pipeline's web/public/data/alerts.json + Mongo metrics). Renders the "awaiting live
// data" empty state until the payload lands, then the real isometric scene.
export function LiveScene() {
  const [data, setData] = useState<AlertsPayload | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/alerts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AlertsPayload | null) => {
        if (alive) setData(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <ThroughTheClouds
      mode="live"
      aoi={data?.aoi ?? AOI}
      alerts={data?.alerts ?? []}
      summary={data?.summary ?? null}
    />
  )
}
