// Isometric projection helpers.
// Tile is a unit square in the XY ground plane; Z is vertical.
// Standard 30-degree isometric: x_iso = (x - y) * cos30, y_iso = (x + y) * sin30 - z

const COS = Math.cos(Math.PI / 6) // ~0.866
const SIN = Math.sin(Math.PI / 6) // 0.5

export type Pt = { x: number; y: number }

export function iso(x: number, y: number, z = 0, scale = 1): Pt {
  return {
    x: (x - y) * COS * scale,
    y: (x + y) * SIN * scale - z * scale,
  }
}

export function polyPath(points: Pt[]): string {
  return (
    'M' +
    points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L') +
    ' Z'
  )
}

// A flat parallelogram floor at height z, unit-size scaled by `size`.
export function floorCorners(size: number, z: number, scale = 1): Pt[] {
  return [
    iso(0, 0, z, scale * size),
    iso(1, 0, z, scale * size),
    iso(1, 1, z, scale * size),
    iso(0, 1, z, scale * size),
  ]
}

// A prism extruded between z0 (base) and z1 (top), with footprint a square
// of side `s` centred at (cx, cy) in unit-coords. Returns the three visible
// faces (top, right, left) as separate paths.
export function prismFaces(
  cx: number,
  cy: number,
  s: number,
  z0: number,
  z1: number,
  scale = 1,
): { top: Pt[]; right: Pt[]; left: Pt[] } {
  const h = s / 2
  const a = { x: cx - h, y: cy - h }
  const b = { x: cx + h, y: cy - h }
  const c = { x: cx + h, y: cy + h }
  const d = { x: cx - h, y: cy + h }
  const T = (p: { x: number; y: number }, z: number) => iso(p.x, p.y, z, scale)
  return {
    top: [T(a, z1), T(b, z1), T(c, z1), T(d, z1)],
    right: [T(b, z0), T(c, z0), T(c, z1), T(b, z1)],
    left: [T(a, z0), T(d, z0), T(d, z1), T(a, z1)],
  }
}
