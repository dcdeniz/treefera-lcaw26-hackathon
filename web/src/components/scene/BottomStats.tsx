import { Separator } from '@/components/ui/separator'

type Props = {
  alertCount: number
  totalAreaHa: number
  alertPct: number
  f1: number
}

export function BottomStats({ alertCount, totalAreaHa, alertPct, f1 }: Props) {
  return (
    <div className="border-t border-border bg-background/95 px-8 py-5 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-end justify-between gap-12">
        <Stat label="Alerts · 2023" value={alertCount.toString()} unit="polygons" hero />
        <Sep />
        <Stat
          label="Total alert area"
          value={totalAreaHa.toFixed(1)}
          unit="ha"
        />
        <Sep />
        <Stat label="Of AOI" value={`${alertPct.toFixed(1)}%`} unit="of 5550 km²" />
        <Sep />
        <Stat label="Validation F1" value={f1.toFixed(2)} unit="vs. Hansen + RADD" />
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

function Sep() {
  return <Separator orientation="vertical" className="h-10" />
}
