'use client'

import { useMemo, useState } from 'react'
import { IsometricScene } from '@/components/scene/IsometricScene'
import { PeelControls } from '@/components/scene/PeelControls'
import { BottomStats } from '@/components/scene/BottomStats'
import { AlertDrawer } from '@/components/scene/AlertDrawer'
import { CommercialTabs } from '@/components/scene/CommercialTabs'
import { DecisionsButton } from '@/components/scene/DecisionsButton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { Alert, Summary, Aoi } from '@/lib/types'

type Props = {
  aoi: Aoi
  alerts?: Alert[]
  summary?: Summary | null
  mode?: 'demo' | 'live'
}

export function ThroughTheClouds({ aoi, alerts = [], summary = null, mode = 'demo' }: Props) {
  const [peel, setPeel] = useState(0) // 0 = clouds fully on, 1 = clouds gone, optical gone too
  const [layers, setLayers] = useState({ clouds: true, optical: true, sar: true, alerts: true })
  const [year, setYear] = useState<'2022' | '2023'>('2023')
  const [selected, setSelected] = useState<Alert | null>(null)

  // Peel curve: 0..0.5 fades clouds; 0.5..1.0 fades optical. Clouds peel first,
  // then optical, leaving SAR + alerts.
  const cloudOpacity = layers.clouds ? Math.max(0, 1 - peel * 2) : 0
  const opticalOpacity = layers.optical ? Math.max(0, 1 - Math.max(0, peel - 0.5) * 2) : 0
  const sarOpacity = layers.sar ? 1 : 0
  // Alerts are computed for the 2023 year per BUILD_CONTRACT §3.10; on 2022
  // there's nothing to show.
  const alertsVisible = layers.alerts && year === '2023'

  const visibleAlerts = useMemo(() => alerts, [alerts])
  const isEmpty = visibleAlerts.length === 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header mode={mode} />

      <main className="relative">
        <div className="relative h-[calc(100vh-200px)] min-h-[560px] w-full overflow-hidden">
          <IsometricScene
            alerts={visibleAlerts}
            cloudOpacity={cloudOpacity}
            opticalOpacity={opticalOpacity}
            sarOpacity={sarOpacity}
            alertsVisible={alertsVisible}
            year={year}
            onSelect={setSelected}
            selectedId={selected?.id}
          />

          {/* Floating controls panel */}
          <div className="pointer-events-auto absolute right-6 top-6">
            <PeelControls
              peel={peel}
              setPeel={setPeel}
              layers={layers}
              setLayers={setLayers}
              year={year}
              setYear={setYear}
            />
          </div>

          {/* AOI annotation, top-left — both polygon and analysis bbox per §1 */}
          <div className="absolute left-8 top-6 max-w-md space-y-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Area of interest · BUILD_CONTRACT §1
            </div>
            <div className="text-base">{aoi.name}</div>
            <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground">
              <div>analysis bbox · [{aoi.bbox.join(', ')}] · EPSG:4326</div>
              <div>hotspot polygon · 113.4292, −1.0733, 113.5708, −0.9267</div>
            </div>
          </div>

          {/* Year stamp framed as a 2022 → 2023 comparison */}
          <div className="absolute bottom-6 left-8 flex items-end gap-4">
            <div className="flex items-baseline gap-2 font-mono">
              <span
                className={
                  year === '2022'
                    ? 'text-6xl leading-none'
                    : 'text-3xl leading-none text-muted-foreground'
                }
              >
                2022
              </span>
              <span className="text-2xl leading-none text-muted-foreground">→</span>
              <span
                className={
                  year === '2023'
                    ? 'text-6xl leading-none'
                    : 'text-3xl leading-none text-muted-foreground'
                }
              >
                2023
              </span>
            </div>
            <div className="flex flex-col gap-1 pb-1">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                ALOS-2 PALSAR-2
              </span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                annual mosaic · HV
              </span>
            </div>
          </div>

          {/* Live empty-state: no mock data, awaiting the API */}
          {mode === 'live' && isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="border border-border bg-background/80 px-5 py-4 text-center backdrop-blur">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  live
                </div>
                <div className="mt-1 text-sm">Awaiting live alerts</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  GET /api/alerts — pending
                </div>
              </div>
            </div>
          )}
        </div>

        <BottomStats
          alertCount={summary?.alert_count ?? 0}
          totalAreaHa={summary?.total_alert_area_ha ?? 0}
          alertPct={summary?.alert_area_pct_of_aoi ?? 0}
          usersAccuracy={summary?.validation.users_accuracy ?? 0}
          producersAccuracy={summary?.validation.producers_accuracy ?? 0}
          f1={summary?.validation.f1 ?? 0}
        />

        <CommercialTabs />
      </main>

      <AlertDrawer alert={selected} onClose={() => setSelected(null)} />

      <Footer />
    </div>
  )
}

function Header({ mode }: { mode: 'demo' | 'live' }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-8 py-4">
      <div className="flex items-center gap-4">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          treefera · lcaw26
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-baseline gap-2">
          <span className="text-base">Through the Clouds</span>
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.14em]">
            SAR · L-band · Borneo
          </Badge>
          <Badge
            variant={mode === 'demo' ? 'secondary' : 'outline'}
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
          >
            {mode}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span>BUILD_CONTRACT v0.1</span>
          <Separator orientation="vertical" className="h-4" />
          <span>orchestration review</span>
        </div>
        <DecisionsButton />
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border px-8 py-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
        <span>Optical can&apos;t see this. SAR already did.</span>
        <span>built on jedorini · neat components</span>
      </div>
    </footer>
  )
}
