import type { Aoi } from '@/lib/types'

// The real Central Kalimantan hotspot AOI (BUILD_CONTRACT §1). This is config,
// not mock data — both the live (/) and demo (/demo) routes use it.
// bbox is the REAL PALSAR data extent (the hotspot), not the wide buffer bbox — the
// pipeline normalises alert centroids to [0,1] within THIS box. See conversations/0003.
export const AOI: Aoi = {
  bbox: [113.4291, -1.0733, 113.5709, -0.9266],
  name: 'Central Kalimantan SAR-through-clouds hotspot',
  centre: [-1.0, 113.5],
}
