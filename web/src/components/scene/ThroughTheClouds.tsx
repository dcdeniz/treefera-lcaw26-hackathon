'use client'

import Link from 'next/link'
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header mode={mode} />

      <main className="relative">
        <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden md:h-[calc(100vh-180px)] md:min-h-[620px]">
          {mode === 'live' ? (
            // Homepage live view: the isometric SAR-through-cloud viewer — OSM underlay →
            // photographic + clouds → gradient reveal → real PALSAR HV deforestation
            // detection, with analyst chrome (layers, legend, identify, metrics). Served
            // self-contained from /public/qgis/map.html.
            <>
              <iframe
                src="/qgis/map.html?embed=1"
                title="Through the Clouds — SAR-through-cloud isometric viewer"
                className="absolute inset-0 h-full w-full border-0"
              />
              <DesktopQrCorner />
            </>
          ) : (
            <>
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

              {/* Floating controls panel — sits over the scene on desktop;
                  on mobile, drops below the year stamp so it doesn't cover
                  half the screen. */}
              <div className="pointer-events-auto absolute right-3 top-3 md:right-6 md:top-6">
                <PeelControls
                  peel={peel}
                  setPeel={setPeel}
                  layers={layers}
                  setLayers={setLayers}
                  year={year}
                  setYear={setYear}
                />
              </div>

              {/* AOI annotation, top-left — both polygon and analysis bbox per §1.
                  Hidden on mobile (overlaps with the PeelControls panel). */}
              <div className="absolute left-4 top-3 hidden max-w-md space-y-2 md:left-8 md:top-6 md:block">
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
              <div className="absolute bottom-3 left-4 flex items-end gap-3 md:bottom-6 md:left-8 md:gap-4">
                <div className="flex items-baseline gap-2 font-mono">
                  <span
                    className={
                      year === '2022'
                        ? 'text-4xl leading-none md:text-6xl'
                        : 'text-2xl leading-none text-muted-foreground md:text-3xl'
                    }
                  >
                    2022
                  </span>
                  <span className="text-xl leading-none text-muted-foreground md:text-2xl">→</span>
                  <span
                    className={
                      year === '2023'
                        ? 'text-4xl leading-none md:text-6xl'
                        : 'text-2xl leading-none text-muted-foreground md:text-3xl'
                    }
                  >
                    2023
                  </span>
                </div>
                <div className="hidden flex-col gap-1 pb-1 md:flex">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    ALOS-2 PALSAR-2
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    annual mosaic · HV
                  </span>
                </div>
              </div>
            </>
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
    <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-border px-4 py-3 md:flex-nowrap md:px-8 md:py-4">
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <div className="hidden text-xs uppercase tracking-[0.18em] text-muted-foreground sm:block">
          treefera · lcaw26
        </div>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <div className="flex flex-wrap items-baseline gap-2">
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
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:flex">
          <span>BUILD_CONTRACT v0.1</span>
          <Separator orientation="vertical" className="h-4" />
          <span>orchestration review</span>
        </div>
        <Link
          href="/information"
          className="inline-flex h-8 cursor-pointer items-center border border-border bg-background px-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-accent md:px-3"
          aria-label="Information"
        >
          <span className="md:hidden">ⓘ</span>
          <span className="hidden md:inline">ⓘ Information</span>
        </Link>
        <DecisionsButton />
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:px-8 md:py-4">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>Optical waits months for a clear pixel. SAR flagged it on the pass.</span>
        <span className="hidden sm:inline">built on jedorini · neat components</span>
      </div>
    </footer>
  )
}

// QR code that appears only on desktop, anchored to the corner of the
// live-mode hero area. Used at LCAW for attendees to scan and pull up the
// live deployment on their own phone.
function DesktopQrCorner() {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden md:block">
      <div className="pointer-events-auto flex flex-col items-end gap-1 border border-border bg-background/95 p-2 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/download.png"
          alt="Scan to open Through the Clouds"
          width={120}
          height={120}
          className="block h-[120px] w-[120px]"
        />
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          scan to open
        </span>
      </div>
    </div>
  )
}
