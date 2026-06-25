import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Props = {
  peel: number  // 0..1 — 0 means clouds fully visible, 1 means fully peeled
  setPeel: (n: number) => void
  layers: { clouds: boolean; optical: boolean; sar: boolean; alerts: boolean }
  setLayers: (p: Props['layers']) => void
  year: '2022' | '2023'
  setYear: (y: '2022' | '2023') => void
}

export function PeelControls({ peel, setPeel, layers, setLayers, year, setYear }: Props) {
  return (
    <Card className="w-[280px] border-border/80 bg-card/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Peel · {Math.round(peel * 100)}%
          </Label>
          <Slider
            value={[peel * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => {
              const n = Array.isArray(v) ? (v[0] ?? 0) : v
              setPeel(n / 100)
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>cloudy</span>
            <span>through</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Layers
          </Label>
          <LayerRow
            label="Clouds"
            checked={layers.clouds}
            onChange={(v) => setLayers({ ...layers, clouds: v })}
          />
          <LayerRow
            label="Optical · SPOT-7"
            checked={layers.optical}
            onChange={(v) => setLayers({ ...layers, optical: v })}
          />
          <LayerRow
            label="SAR · PALSAR HV"
            checked={layers.sar}
            onChange={(v) => setLayers({ ...layers, sar: v })}
          />
          <LayerRow
            label="Alerts"
            checked={layers.alerts}
            onChange={(v) => setLayers({ ...layers, alerts: v })}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Year
          </Label>
          <ToggleGroup
            value={[year]}
            onValueChange={(v) => {
              const next = v[0]
              if (next === '2022' || next === '2023') setYear(next)
            }}
            className="w-full"
          >
            <ToggleGroupItem value="2022" className="flex-1">
              2022
            </ToggleGroupItem>
            <ToggleGroupItem value="2023" className="flex-1">
              2023
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  )
}

function LayerRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
