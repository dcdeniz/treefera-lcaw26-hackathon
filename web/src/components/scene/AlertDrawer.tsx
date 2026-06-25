import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { floorCorners, polyPath, prismFaces } from '@/lib/iso'
import type { Alert } from '@/lib/types'

type Props = {
  alert: Alert | null
  onClose: () => void
}

export function AlertDrawer({ alert, onClose }: Props) {
  return (
    <Sheet open={!!alert} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-full sm:w-[440px] sm:max-w-[440px] p-0">
        {alert && (
          <>
            <SheetHeader className="space-y-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SheetTitle className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {alert.id}
                </SheetTitle>
                <FrontierBadge active={alert.candidate_plantation_frontier} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl leading-none">{alert.area_ha.toFixed(1)}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  hectares lost · {alert.year}
                </span>
              </div>
            </SheetHeader>

            <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
              <Section label="Isometric inset">
                <div className="flex h-44 items-center justify-center border border-border bg-card">
                  <MiniIso alert={alert} />
                </div>
              </Section>

              <Section label="HV backscatter">
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Baseline" value={`${alert.baseline_hv_db.toFixed(2)} dB`} />
                  <Metric
                    label="Mean Δ"
                    value={`${alert.mean_delta_hv_db.toFixed(2)} dB`}
                    emphatic
                  />
                  <Metric label="Min Δ" value={`${alert.min_delta_hv_db.toFixed(2)} dB`} />
                </div>
              </Section>

              <Section label="Cross-checks · BUILD_CONTRACT §5">
                <div className="flex flex-col gap-2">
                  <CheckRow
                    label="Hansen GFC"
                    rule={`lossyear == ${alert.year - 2000} ∧ treecover2000 ≥ 30`}
                    state={alert.cross_checks.hansen_gfc_2023 ? 'agree' : 'silent'}
                  />
                  <CheckRow
                    label="RADD alerts"
                    rule="2023 in AOI · EE fallback if absent"
                    state={alert.cross_checks.radd_2023 ? 'agree' : 'silent'}
                  />
                  <CheckRow
                    label="SPOT-7"
                    rule="visual · scene 2022-04-23"
                    state={
                      alert.cross_checks.spot_visual === 'forest'
                        ? 'agree'
                        : alert.cross_checks.spot_visual === 'cleared'
                        ? 'disagree'
                        : 'unclear'
                    }
                  />
                </div>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      {children}
    </section>
  )
}

function FrontierBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant={active ? 'default' : 'outline'}
      className="font-mono text-[10px] uppercase tracking-[0.14em]"
    >
      {active ? '■ frontier candidate' : '□ small clearing'}
    </Badge>
  )
}

function Metric({ label, value, emphatic }: { label: string; value: string; emphatic?: boolean }) {
  return (
    <div className="border border-border bg-card p-3">
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={emphatic ? 'mt-1 text-base' : 'mt-1 text-sm text-muted-foreground'}>
        {value}
      </div>
    </div>
  )
}

function CheckRow({
  label,
  rule,
  state,
}: {
  label: string
  rule: string
  state: 'agree' | 'disagree' | 'unclear' | 'silent'
}) {
  const glyph =
    state === 'agree' ? '■' : state === 'disagree' ? '□' : state === 'unclear' ? '◐' : '·'
  const text =
    state === 'agree'
      ? 'confirmed'
      : state === 'disagree'
      ? 'disagrees'
      : state === 'unclear'
      ? 'unclear'
      : 'no signal'
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-1.5 text-xs">
      <div className="flex flex-col gap-0.5">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{rule}</span>
      </div>
      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <span className="text-base leading-none text-foreground">{glyph}</span>
        <span className="uppercase tracking-[0.14em] text-[10px]">{text}</span>
      </span>
    </div>
  )
}

function MiniIso({ alert }: { alert: Alert }) {
  const SIZE = 90
  const sar = floorCorners(1, 0, SIZE)
  const cloud = floorCorners(1, 0.45, SIZE)
  // single prism centred on the inset, height scaled to |mean_delta_hv|
  const z1 = 0.12 + Math.min(0.6, Math.abs(alert.mean_delta_hv_db) * 0.09)
  const faces = prismFaces(0.5, 0.5, 0.28, 0, z1, SIZE)
  return (
    <svg viewBox="-110 -90 220 180" className="h-full w-full">
      <path d={polyPath(sar)} fill="#161616" stroke="#ffffff" strokeWidth={0.6} />
      <path d={polyPath(cloud)} fill="#ffffff" stroke="#ffffff" strokeWidth={0.4} fillOpacity={0.07} strokeOpacity={0.4} />
      <path d={polyPath(faces.left)} fill="#000000" stroke="#ffffff" strokeWidth={1.2} />
      <path d={polyPath(faces.right)} fill="#0a0a0a" stroke="#ffffff" strokeWidth={1.2} />
      <path d={polyPath(faces.top)} fill="#1c1c1c" stroke="#ffffff" strokeWidth={1.2} />
    </svg>
  )
}
