import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const STEPS: { n: string; title: string; body: string; Icon: () => React.ReactElement }[] = [
  {
    n: '01',
    title: 'Calibrate',
    body: 'PALSAR DN → gamma0 dB. gamma0 = 10·log10(DN²) − 83.0. Drop DN = 0 as nodata.',
    Icon: IconCalibrate,
  },
  {
    n: '02',
    title: 'Filter',
    body: 'Quegan–Yu multitemporal expected-value 5×5, then Lee spatial 7×7. Speckle σ drops ≥ 30%.',
    Icon: IconFilter,
  },
  {
    n: '03',
    title: 'Detect',
    body: 'Δ HV ≤ −2.0 dB · water & non-forest masked · opening / closing · MMU 0.2 ha (32 px @ 25 m).',
    Icon: IconDetect,
  },
  {
    n: '04',
    title: 'Validate',
    body: '100 stratified samples vs. Hansen GFC 2023, RADD 2023, SPOT-7 visual. Report PA, UA, F1.',
    Icon: IconValidate,
  },
  {
    n: '05',
    title: 'Visualise',
    body: 'Isometric stack · clouds / optical / SAR / alerts. Peel control reveals the SAR layer below.',
    Icon: IconVisualise,
  },
]

export function MethodologyStrip() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Pipeline · 5 stages
          </h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            scroll →
          </span>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-stretch gap-4 snap-start shrink-0">
              <Card className="w-[300px] shrink-0 border-border bg-card">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {s.n}
                    </span>
                    <s.Icon />
                  </div>
                  <h3 className="text-xl">{s.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
              {i < STEPS.length - 1 && (
                <div className="flex items-center">
                  <Separator orientation="horizontal" className="w-6" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function IconCalibrate() {
  return (
    <svg viewBox="0 0 32 24" className="h-6 w-8" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M2 22 L8 12 L14 18 L24 4 L30 10" />
      <path d="M2 22 L30 22" strokeDasharray="1 2" />
    </svg>
  )
}
function IconFilter() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2" y="2" width="20" height="20" />
      <path d="M6 6 L18 6 M6 12 L18 12 M6 18 L18 18" strokeDasharray="2 2" />
    </svg>
  )
}
function IconDetect() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M3 21 L9 21 L9 12 L15 12 L15 21 L21 21" />
      <path d="M2 21 L22 21" />
    </svg>
  )
}
function IconValidate() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="8" />
      <rect x="3" y="13" width="8" height="8" />
      <rect x="13" y="13" width="8" height="8" />
      <path d="M14 17 L16 19 L20 15" />
    </svg>
  )
}
function IconVisualise() {
  return (
    <svg viewBox="0 0 32 24" className="h-6 w-8" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M2 18 L16 10 L30 18 L16 26 Z" transform="translate(0,-4)" />
      <path d="M2 14 L16 6 L30 14 L16 22 Z" opacity="0.4" />
    </svg>
  )
}
