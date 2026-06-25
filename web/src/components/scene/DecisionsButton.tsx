import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { decisions, failureModes } from '@/data/contract'

export function DecisionsButton() {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-8 cursor-pointer items-center border border-border bg-background px-3 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-accent"
      >
        ⚑ {decisions.length} decisions · {failureModes.length} fallbacks
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[420px] max-h-[70vh] overflow-y-auto p-0"
      >
        <div className="border-b border-border px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            BUILD_CONTRACT §8
          </div>
          <div className="mt-1 text-sm">Decisions for human reviewers</div>
        </div>
        <ul className="divide-y divide-border">
          {decisions.map((d) => (
            <li key={d.n} className="px-5 py-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  D{d.n}
                </span>
                <span className="text-xs">{d.title}</span>
              </div>
              <p className="mt-1 pl-7 text-[11px] leading-relaxed text-muted-foreground">
                {d.body}
              </p>
            </li>
          ))}
        </ul>
        <Separator />
        <div className="border-b border-border px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            BUILD_CONTRACT §10
          </div>
          <div className="mt-1 text-sm">Failure modes &amp; fallbacks</div>
        </div>
        <ul className="divide-y divide-border">
          {failureModes.map((f, i) => (
            <li key={i} className="space-y-1 px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs">{f.failure}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {f.owner}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-mono uppercase tracking-[0.14em]">detector</span> ·{' '}
                {f.detector}
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-mono uppercase tracking-[0.14em]">fallback</span> ·{' '}
                {f.fallback}
              </p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
