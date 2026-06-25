import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { agents, pipelineSteps, type AgentId } from '@/data/contract'

export function MethodologyStrip() {
  return (
    <>
      <AgentsStrip />
      <PipelineStrip />
    </>
  )
}

function AgentsStrip() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8 md:py-10">
        <Header
          left="Orchestration · 6 agents"
          right="BUILD_CONTRACT §2"
        />
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
          {agents.map((a, i) => (
            <React.Fragment key={a.id}>
              <Card className="w-[280px] shrink-0 snap-start border-border bg-card">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl leading-none">{a.id}</span>
                    <JudgementChip level={a.judgement} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base">{a.name}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      owns {a.ownsLabel}
                    </p>
                  </div>
                  <Separator />
                  <Row k="Parallelisable" v={a.parallelisable} />
                  <Row k="Wall time" v={a.walltime_min ? `~${a.walltime_min} min` : 'continuous'} />
                </CardContent>
              </Card>
              {i < agents.length - 1 && <FlowArrow />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

function PipelineStrip() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8 md:py-10">
        <Header
          left="Pipeline · 11 steps"
          right="BUILD_CONTRACT §3"
        />
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-3">
          {pipelineSteps.map((s) => (
            <Card
              key={s.num}
              className="w-[240px] shrink-0 snap-start border-border bg-card"
            >
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    §{s.num}
                  </span>
                  <OwnerPill owner={s.owner} />
                </div>
                <h3 className="text-sm leading-snug">{s.title}</h3>
                <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {s.inOut}
                </p>
                {s.thresholdOrParam && (
                  <p className="font-mono text-[10px] leading-relaxed">
                    {s.thresholdOrParam}
                  </p>
                )}
                <Separator />
                <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                  <span className="mt-[1px] font-mono">gate</span>
                  <span className="flex-1">{s.gate}</span>
                </div>
                {s.cite && (
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                    cite · {s.cite}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function Header({ left, right }: { left: string; right: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between">
      <h2 className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{left}</h2>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {right}
      </span>
    </div>
  )
}

function FlowArrow() {
  return (
    <div className="flex shrink-0 items-center px-1 text-muted-foreground">
      <span className="font-mono text-xl leading-none">→</span>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-[10px]">
      <span className="uppercase tracking-[0.14em] text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  )
}

function OwnerPill({ owner }: { owner: AgentId }) {
  return (
    <Badge
      variant="outline"
      className="font-mono text-[10px] uppercase tracking-[0.18em] px-1.5 py-0"
    >
      {owner}
    </Badge>
  )
}

function JudgementChip({ level }: { level: 'low' | 'medium' | 'high' }) {
  const glyph = level === 'high' ? '■■■' : level === 'medium' ? '■■□' : '■□□'
  return (
    <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
      <span className="text-foreground">{glyph}</span>
      <span>{level} judgement</span>
    </span>
  )
}
