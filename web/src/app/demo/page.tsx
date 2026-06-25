import { ThroughTheClouds } from '@/components/scene/ThroughTheClouds'
import { aoi, alerts, summary } from '@/data/mock'

// /demo = the full isometric demo, fed by the bundled mock data.
export default function DemoPage() {
  return <ThroughTheClouds mode="demo" aoi={aoi} alerts={alerts} summary={summary} />
}
