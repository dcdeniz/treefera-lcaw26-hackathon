// Real geographic view of the SAR alert layer (the isometric scene abstracts the
// geography away). Full-bleed iframe of the self-contained Leaflet map served from
// /public/qgis/map.html — additive, no new deps, does not touch the static-first demo.
export const metadata = {
  title: 'Through the Clouds — Borneo SAR alert map',
  description: 'L-band PALSAR HV change-detection alerts (2022→2023) over Central Kalimantan.',
}

export default function MapPage() {
  return (
    <iframe
      src="/qgis/map.html"
      title="Borneo SAR alert map"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
    />
  )
}
