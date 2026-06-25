import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// /information = plain-English explainer of what was built and why.
// Audience: non-technical readers (commercial, regulatory, partners).
// No jargon without a sentence of context next to it.
export const metadata = {
  title: 'Through the Clouds — Information',
  description:
    'A plain-English explainer of the Through the Clouds hackathon project: what we built, how it works, and why we made the choices we did.',
}

export default function InformationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <TopBar />
      <Hero />
      <Problem />
      <WhatWeBuilt />
      <HowItWorks />
      <DataSources />
      <WhyTheseChoices />
      <HonestLimits />
      <WhereNext />
      <Footer />
      <DesktopQrCorner />
    </main>
  )
}

// QR code anchored to the bottom-right corner. Visible only on desktop (md+)
// so it doesn't crowd small screens. Targets attendees scanning from the
// projector at LCAW.
function DesktopQrCorner() {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 hidden md:block">
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

function TopBar() {
  return (
    <div className="border-b border-border">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 md:px-8 md:py-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Through the Clouds · LCAW 2026
        </span>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:gap-5">
          <Link href="/" className="hover:text-foreground">Live</Link>
          <Link href="/demo" className="hover:text-foreground">Demo</Link>
          <Link href="/map" className="hover:text-foreground">Map</Link>
          <span className="text-foreground">Information</span>
        </nav>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8 md:py-16">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          What this project is
        </p>
        <h1 className="max-w-4xl text-3xl leading-tight md:text-4xl">
          A way to see forest being cleared in places where ordinary satellites
          can&apos;t — because the view is hidden behind clouds.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Most tools that track deforestation rely on photographs from space.
          Photographs need a clear sky. In tropical regions like Borneo, the
          sky is rarely clear — clouds sit over the same patches of forest for
          months at a time. That means people who buy palm oil, run carbon
          projects, or write reports on illegal clearing are working with a
          view that has whole pieces missing.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          We built a system that uses a different kind of satellite — one that
          fires radio waves at the ground and listens to what comes back.
          Radio waves pass straight through clouds and even through the leafy
          canopy of the forest itself. By comparing two years of these radio
          signals over Central Kalimantan, we can produce a map of the patches
          of forest that were standing in 2022 and gone in 2023.
        </p>
      </div>
    </section>
  )
}

const PROBLEM_CARDS = [
  {
    num: '01',
    title: 'Clouds hide everything',
    body: `In Central Kalimantan, on average roughly three out of ten days in any given month have zero clear satellite views of the ground. Some patches of forest see no clear view for months. Photo-based tools simply guess, wait, or skip those patches.`,
  },
  {
    num: '02',
    title: 'Existing radar tools struggle with thick forest',
    body: `There are radar-based tools already, but most of them use short radio waves that bounce off the very top of the canopy. In thick tropical forest those signals get confused — they can't tell a tall healthy forest from a slightly less tall one.`,
  },
  {
    num: '03',
    title: 'A regulatory deadline is coming',
    body: `From the end of 2026, the European Union will not allow palm oil, rubber, timber, coffee or several other products to be sold into Europe unless the company can prove the land wasn't cleared after 2020. Companies need evidence. Cloudy regions are exactly where that evidence is hardest to get.`,
  },
] as const

function Problem() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8 md:py-14">
        <SectionHeader left="The problem" right="Why this needed to exist" />
        <div className="grid gap-4 md:grid-cols-3">
          {PROBLEM_CARDS.map((c) => (
            <Card key={c.num} className="border-border bg-card">
              <CardContent className="space-y-3 p-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {c.num}
                </span>
                <h3 className="text-base">{c.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const PIECES = [
  {
    tag: '01 · The detector',
    title: 'A small program that finds the cleared patches',
    body: `A Python program takes two radar images of the same forest, one from 2022 and one from 2023. It compares them pixel by pixel, removes background noise, ignores rivers and bare land, and outlines every patch where the signal dropped enough to mean the forest there is gone. It runs in seconds on an ordinary laptop. The output is a simple map file listing every alert — how big it is, how confident we are, and whether it looks like the start of a new plantation.`,
  },
  {
    tag: '02 · The website',
    title: 'A way to actually see the result',
    body: `A web page built with Next.js. The landing page shows the area from above as a tilted 3D-looking scene. You can drag a slider that "peels back" layers: first the clouds disappear, then the photo-based view fades, and finally the radar-based alerts rise up out of the ground as little columns. There is also a full map view at /map where you can pan around and click each alert to see its details.`,
  },
  {
    tag: '03 · The database (optional)',
    title: "A memory of every run we've done",
    body: `A small MongoDB database keeps a record of every time the detector has been run: which area, which thresholds we used, how it scored against reference data, and where the resulting files live. It is intentionally optional — the demo works without it. It exists so the project can grow from a single demo into a service that monitors many areas over time.`,
  },
  {
    tag: '04 · The agent layer',
    title: 'A way for other software (and AI) to drive it',
    body: `A separate set of components lets other software ask the system to do things: "run the detector on this area," "tell me which alerts are inside this concession," "re-tune the threshold and re-run." This uses an emerging standard called MCP (Model Context Protocol), which is the bridge AI assistants use to drive tools. It means a future version can be operated by an AI assistant or by another team's software without us writing custom glue every time.`,
  },
] as const

function WhatWeBuilt() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8 md:py-14">
        <SectionHeader left="What we built" right="Four pieces, one story" />
        <div className="grid gap-4 md:grid-cols-2">
          {PIECES.map((p) => (
            <Card key={p.tag} className="border-border bg-card">
              <CardContent className="space-y-3 p-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {p.tag}
                </span>
                <h3 className="text-base leading-snug">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  {
    n: '1',
    t: 'Take two radar pictures, one year apart',
    b: `We download annual radar mosaics of Central Kalimantan from a free public source (Google Earth Engine), one for 2022 and one for 2023. These are already cleaned up and aligned to a map.`,
  },
  {
    n: '2',
    t: 'Smooth out the static',
    b: `Radar images are speckly, like an old TV channel with bad reception. We run a standard smoothing filter (called a Lee filter) that removes the random noise without softening the real edges of forest patches.`,
  },
  {
    n: '3',
    t: "Ignore everything that isn't living forest",
    b: `We mask out water (rivers, peat ponds) and bare ground that was never forest in the first place. That way we only ever compare forest to forest.`,
  },
  {
    n: '4',
    t: 'Subtract and threshold',
    b: `For every pixel, we ask: did the radar signal drop by more than 2.5 decibels (a measure of signal strength) between 2022 and 2023? That much of a drop only happens when a lot of woody material has been removed — in other words, a real clearing.`,
  },
  {
    n: '5',
    t: 'Tidy up the edges',
    b: `Standard image-processing steps fill in tiny holes and remove specks. Any cleared patch smaller than about 0.2 hectares (roughly a quarter of a football pitch) is dropped — it's too small to be reliable.`,
  },
  {
    n: '6',
    t: 'Draw outlines and label each one',
    b: `Every remaining patch becomes an outlined polygon on a map. We attach numbers to it: its area, the average drop in signal, and a flag if it looks like the start of a new plantation (large patch + sharp signal drop).`,
  },
  {
    n: '7',
    t: 'Compare against a reference',
    b: `We compare our alerts against Hansen Global Forest Change, a well-known reference dataset that uses photographs. We don't expect a perfect match — Hansen misses things under clouds, which is the whole point of using radar. We report the comparison honestly.`,
  },
] as const

function HowItWorks() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8 md:py-14">
        <SectionHeader left="How it works" right="Seven steps, no magic" />
        <div className="grid gap-3 md:grid-cols-2">
          {STEPS.map((s) => (
            <Card key={s.n} className="border-border bg-card">
              <CardContent className="flex gap-5 p-5">
                <span className="font-mono text-2xl leading-none text-muted-foreground">
                  {s.n}
                </span>
                <div className="space-y-2">
                  <h3 className="text-sm leading-snug">{s.t}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.b}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const DATA_ROWS = [
  {
    name: 'PALSAR-2 (Japanese L-band radar)',
    what: `A satellite operated by the Japanese space agency that fires long radio waves at the ground. Because the waves are long, they reach down through the leaves to the branches and trunks beneath. Long waves carry more information about how much wood is actually standing.`,
    role: 'The main signal. The 2022 and 2023 yearly images are what we compare.',
  },
  {
    name: 'Sentinel-1 (European C-band radar)',
    what: `A different European radar satellite that uses shorter radio waves. Shorter waves bounce off the top of the canopy and don't see as deep.`,
    role: 'Available as a backup; not used as the main signal because it saturates in thick tropical forest.',
  },
  {
    name: 'Sentinel-2 (European optical)',
    what: `A satellite that takes ordinary colour photographs. It is what most existing deforestation tools use. It cannot see through clouds.`,
    role: 'Used in the website to show the photo view that gets revealed when you peel back the clouds — to make the point visually.',
  },
  {
    name: 'Hansen Global Forest Change',
    what: `A widely-cited dataset published by the University of Maryland that maps forest loss using optical satellite photos.`,
    role: 'Used as a cross-reference, not as ground truth. Hansen misses clearings under cloud — that is, by design, what we are trying to catch.',
  },
  {
    name: 'SPOT-7 (high-resolution photographs)',
    what: `Commercial satellite photographs with much sharper detail (each pixel is about 1.5 metres across).`,
    role: 'Used to manually check disputed alerts by eye, in cases where photos do exist.',
  },
] as const

function DataSources() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8 md:py-14">
        <SectionHeader left="The data we used" right="Five sources, public and free" />
        <div className="grid gap-3">
          {DATA_ROWS.map((r) => (
            <Card key={r.name} className="border-border bg-card">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[280px_1fr_1fr]">
                <h3 className="text-sm">{r.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{r.what}</p>
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Role here
                  </p>
                  <p className="text-sm leading-relaxed">{r.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const DECISIONS = [
  {
    q: 'Why radar, and not just better photos?',
    a: `Because no amount of cleverness on photographs gets you through a cloud. The cloud is simply blocking the signal. Radar is a fundamentally different signal that passes through. For places like Borneo, this isn't a small improvement — it is the difference between seeing the deforestation when it happens and finding out about it months later when a clear photograph finally exists.`,
  },
  {
    q: 'Why this specific Japanese radar (PALSAR-2) and not the European one?',
    a: `The two satellites use radio waves of different lengths. Short waves (Europe's) only see the top of the canopy. Long waves (Japan's) reach through the canopy to the branches and trunks below. In thick tropical forest, only the long-wave version actually responds when wood is removed. The short-wave version often can't tell the difference.`,
  },
  {
    q: 'Why no machine learning or AI in the detector itself?',
    a: `We tested it. We tried teaching a machine-learning model to spot the difference, and it did not do meaningfully better than a simple rule: "if the signal dropped by more than this much, flag it." A simple rule is also easier to explain to a regulator, easier to audit, and easier to defend in court. So we kept it simple.`,
  },
  {
    q: 'Why is the demo so visual — the peeling clouds, the 3D scene?',
    a: `Because the whole point of the project is that there is something hidden underneath the clouds. A flat 2D map cannot show you that. A scene where you literally drag the clouds away makes the argument immediately, even to someone who has never thought about satellites before.`,
  },
  {
    q: 'Why is the database optional?',
    a: `For the demo, every piece of data is shipped inside the website itself, like a brochure. That means it never goes down, never needs a login, never has to wait for a server. The database is there to support the next step — running the system over many areas, keeping a history, letting customers log in — but it is not required for the demo to work.`,
  },
  {
    q: 'Why include the agent / MCP layer at all?',
    a: `Because the most realistic future user of this system isn't a person clicking buttons — it's another piece of software, or an AI assistant, asking on someone's behalf: "has any of my supplier's land been cleared this year?" Building that interface in from the start means we don't have to rebuild later.`,
  },
  {
    q: 'Why Borneo and not somewhere else?',
    a: `Because Borneo is where the problem is sharpest. It has some of the heaviest cloud cover in the world, some of the fastest deforestation, the largest concentration of palm oil — which is the single biggest commodity affected by the 2026 EU regulation — and several large carbon projects that are under intense scrutiny. If the system works here, it works anywhere.`,
  },
] as const

function WhyTheseChoices() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8 md:py-14">
        <SectionHeader left="Why we made these choices" right="The decisions behind the build" />
        <div className="grid gap-3">
          {DECISIONS.map((d) => (
            <Card key={d.q} className="border-border bg-card">
              <CardContent className="space-y-2 p-5">
                <h3 className="text-sm">{d.q}</h3>
                <Separator />
                <p className="text-sm leading-relaxed text-muted-foreground">{d.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const LIMITS = [
  {
    tag: 'Not a finished product',
    body: `This was built in a hackathon week. It works for one specific area of Central Kalimantan (roughly 20 km by 20 km), with thresholds tuned for that area. Moving it to a new place takes a small amount of re-tuning.`,
  },
  {
    tag: 'Not real-time',
    body: `The radar images we use come in once a year. So our alerts are annual — they tell you what changed between one year and the next, not what happened yesterday. There is a way to make it monthly using a different radar source, and that is on the road map, but it isn't in this build.`,
  },
  {
    tag: 'Not a perfect match to the existing reference',
    body: `When compared pixel-by-pixel to the standard Hansen reference, we agree on about a third of the area. That sounds low, but the reference itself is photo-based and misses things under clouds — which is the entire reason we built this. When compared the right way (does each alert overlap with a known cleared area?) we are right roughly half the time, with the disagreements being mostly cases where the photo-based reference couldn't see.`,
  },
  {
    tag: 'Not a species classifier',
    body: `We can flag a patch as a "likely new plantation frontier" based on its shape and the sharpness of the signal drop. We cannot say "this is oil palm" versus "this is rubber" from the radar alone — that needs additional data we didn't use here.`,
  },
] as const

function HonestLimits() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8 md:py-14">
        <SectionHeader left="What this is not" right="Honest about the edges" />
        <div className="grid gap-4 md:grid-cols-2">
          {LIMITS.map((l) => (
            <Card key={l.tag} className="border-border bg-card">
              <CardContent className="space-y-3 p-6">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                >
                  {l.tag}
                </Badge>
                <p className="text-sm leading-relaxed text-muted-foreground">{l.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const NEXT = [
  {
    tag: 'More areas',
    body: `Roll the same detector across the nine territories Treefera already monitors, instead of just one.`,
  },
  {
    tag: 'More frequent alerts',
    body: `Switch in the European C-band radar for sub-annual checks — knowing that it saturates in thick forest but is useful for catching change quickly.`,
  },
  {
    tag: 'Sharper outlines',
    body: `Use object-based segmentation (treating each cleared patch as a single object, not just a cloud of pixels) to push our precision higher.`,
  },
  {
    tag: 'Customer access',
    body: `Add logins, accounts, and email alerts when a new clearing appears inside one of a customer's concessions.`,
  },
] as const

function WhereNext() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8 md:py-14">
        <SectionHeader left="Where this goes next" right="The road from demo to product" />
        <div className="grid gap-3 md:grid-cols-2">
          {NEXT.map((n) => (
            <Card key={n.tag} className="border-border bg-card">
              <CardContent className="space-y-2 p-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {n.tag}
                </span>
                <p className="text-sm leading-relaxed">{n.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Through the Clouds · Treefera · LCAW 2026
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Hackathon build · honest numbers · no jargon
        </span>
      </div>
    </footer>
  )
}

function SectionHeader({ left, right }: { left: string; right: string }) {
  return (
    <div className="mb-6 flex items-baseline justify-between">
      <h2 className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{left}</h2>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {right}
      </span>
    </div>
  )
}
