import { Separator } from '@/components/ui/separator'
import { evaluateGate } from '@/data/contract'

type Props = {
  alertCount: number
  totalAreaHa: number
  alertPct: number
  usersAccuracy: number
  producersAccuracy: number
  f1: number
}

export function BottomStats({
  alertCount,
  totalAreaHa,
  alertPct,
  usersAccuracy,
  producersAccuracy,
  f1,
}: Props) {
  const gate = evaluateGate({
    users_accuracy: usersAccuracy,
    producers_accuracy: producersAccuracy,
    f1,
    alert_area_pct: alertPct,
  })

  return (
    <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur md:px-8 md:py-5">
      <div className="mx-auto grid max-w-screen-2xl grid-cols-2 items-end gap-x-4 gap-y-4 sm:grid-cols-3 md:flex md:justify-between md:gap-8">
        <Stat label="Alerts · 2023" value={alertCount.toString()} unit="polygons" hero />
        <Sep />
        <Stat label="Total alert area" value={totalAreaHa.toFixed(1)} unit="ha" />
        <Sep />
        <GateMetric
          label="of AOI"
          value={`${alertPct.toFixed(1)}%`}
          rule="∈ [0.2, 8]"
          pass={gate.checks[3].pass}
        />
        <Sep />
        <GateMetric
          label="User's accuracy"
          value={usersAccuracy.toFixed(2)}
          rule="≥ 0.75"
          pass={gate.checks[0].pass}
        />
        <GateMetric
          label="Producer's"
          value={producersAccuracy.toFixed(2)}
          rule="≥ 0.65"
          pass={gate.checks[1].pass}
        />
        <GateMetric
          label="F1"
          value={f1.toFixed(2)}
          rule="≥ 0.70"
          pass={gate.checks[2].pass}
        />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  hero = false,
}: {
  label: string
  value: string
  unit: string
  hero?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={hero ? 'text-4xl leading-none' : 'text-2xl leading-none'}>
          {value}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  )
}

function GateMetric({
  label,
  value,
  rule,
  pass,
}: {
  label: string
  value: string
  rule: string
  pass: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl leading-none">{value}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {pass ? '■' : '□'} {rule}
        </span>
      </div>
    </div>
  )
}

// Separator only appears on the desktop flex row — on the mobile grid we let
// the gap do the work.
function Sep() {
  return <Separator orientation="vertical" className="hidden h-10 md:block" />
}
