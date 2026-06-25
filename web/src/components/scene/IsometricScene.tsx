import { useMemo } from 'react'
import { floorCorners, polyPath, prismFaces } from '@/lib/iso'
import type { Alert } from '@/data/mock'

type Props = {
  alerts: Alert[]
  cloudOpacity: number    // 0..1
  opticalOpacity: number  // 0..1
  sarOpacity: number      // 0..1
  alertsVisible: boolean
  onSelect: (a: Alert) => void
  selectedId?: string | null
}

const SIZE = 320          // unit-tile pixel scale
// All Z values are in unit space (same units as the 1x1 floor) and get
// multiplied by SIZE inside iso(). Keep them well under 1 so the cloud deck
// and prism tops stay inside the viewBox.
const DECK_Z = {
  sar: 0,
  optical: 0.18,
  cloud: 0.45,
}
const PRISM_TOP_MAX = 0.75 // max prism top z in unit space

export function IsometricScene(props: Props) {
  const {
    alerts,
    cloudOpacity,
    opticalOpacity,
    sarOpacity,
    alertsVisible,
    onSelect,
    selectedId,
  } = props

  const sarCorners = useMemo(() => floorCorners(1, DECK_Z.sar, SIZE), [])
  const opticalCorners = useMemo(() => floorCorners(1, DECK_Z.optical, SIZE), [])
  const cloudCorners = useMemo(() => floorCorners(1, DECK_Z.cloud, SIZE), [])

  // sort alerts back-to-front by (x+y) so prisms in front overlap those behind
  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => a.centroid[0] + a.centroid[1] - (b.centroid[0] + b.centroid[1])),
    [alerts],
  )

  return (
    <svg
      viewBox="-360 -260 720 600"
      className="h-full w-full select-none"
      role="img"
      aria-label="Isometric stack: cloud over optical over SAR, with deforestation alert prisms"
    >
      <defs>
        {/* SAR speckle: dense fine dots, full white on black ground */}
        <pattern id="sar" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#0a0a0a" />
          <circle cx="1" cy="1" r="0.5" fill="#9a9a9a" />
          <circle cx="3" cy="4" r="0.4" fill="#c8c8c8" />
          <circle cx="5" cy="2" r="0.3" fill="#6a6a6a" />
          <circle cx="2" cy="5" r="0.35" fill="#aeaeae" />
        </pattern>

        {/* Optical: turbulence to suggest a forest photo, desaturated */}
        <filter id="opticalNoise" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="3" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 1 0"
          />
        </filter>
        <pattern id="optical" width="160" height="160" patternUnits="userSpaceOnUse">
          <rect width="160" height="160" fill="#3a3a3a" />
          <rect width="160" height="160" filter="url(#opticalNoise)" opacity="0.6" />
        </pattern>

        {/* Cloud: wispy white turbulence */}
        <filter id="cloudNoise" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="11">
            <animate
              attributeName="baseFrequency"
              dur="30s"
              values="0.018;0.022;0.018"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.4"
          />
        </filter>
        <pattern id="cloud" width="360" height="360" patternUnits="userSpaceOnUse">
          <rect width="360" height="360" fill="transparent" />
          <rect width="360" height="360" filter="url(#cloudNoise)" />
        </pattern>

        {/* Grid hint on SAR floor */}
        <pattern id="sarGrid" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <rect width="40" height="40" fill="transparent" />
          <path d="M0 0 L40 0 M0 0 L0 40" stroke="#2a2a2a" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* SAR layer (bottom) */}
      <g opacity={sarOpacity}>
        <path d={polyPath(sarCorners)} fill="url(#sar)" />
        <path d={polyPath(sarCorners)} fill="url(#sarGrid)" />
        <path d={polyPath(sarCorners)} fill="none" stroke="#ffffff" strokeWidth={1} />
      </g>

      {/* Optical layer */}
      <g opacity={opticalOpacity}>
        <path d={polyPath(opticalCorners)} fill="url(#optical)" />
        <path d={polyPath(opticalCorners)} fill="none" stroke="#ffffff" strokeWidth={1} />
      </g>

      {/* Cloud layer (top) */}
      <g opacity={cloudOpacity}>
        <path d={polyPath(cloudCorners)} fill="url(#cloud)" />
        <path d={polyPath(cloudCorners)} fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.5} />
      </g>

      {/* Alert prisms — drawn last so they pierce through every deck */}
      {alertsVisible && (
        <g>
          {sortedAlerts.map((a) => {
            const [cx, cy] = a.centroid
            // map area_ha to a sensible side, mean_delta_hv to a sensible height
            const side = Math.min(0.06, 0.018 + a.area_ha / 600)
            // map area_ha (0..~20) to a height in unit space, capped just over the cloud deck
            const z1 = DECK_Z.sar + Math.min(PRISM_TOP_MAX, 0.12 + a.area_ha * 0.03)
            const opacity = Math.max(0.35, Math.min(1, Math.abs(a.mean_delta_hv_db) / 6))
            const isFrontier = a.candidate_plantation_frontier
            const isSelected = selectedId === a.id
            const stroke = isFrontier ? '#ffffff' : '#cfcfcf'
            const strokeWidth = isSelected ? 2.4 : isFrontier ? 1.4 : 0.6
            const fill = '#000000'
            const faces = prismFaces(cx, cy, side, DECK_Z.sar, z1, SIZE)

            return (
              <g
                key={a.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(a)}
                opacity={opacity}
              >
                <path d={polyPath(faces.left)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                <path d={polyPath(faces.right)} fill="#0a0a0a" stroke={stroke} strokeWidth={strokeWidth} />
                <path d={polyPath(faces.top)} fill="#161616" stroke={stroke} strokeWidth={strokeWidth} />
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}
