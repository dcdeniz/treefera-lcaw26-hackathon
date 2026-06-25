import { LiveScene } from '@/components/scene/LiveScene'

// Slugless / = the LIVE view. Fetches real alerts client-side from GET /api/alerts
// (engineer's route handler → web/public/data/alerts.json + Mongo metrics).
// Falls back to the "awaiting live data" empty state until the payload lands.
export default function Page() {
  return <LiveScene />
}
