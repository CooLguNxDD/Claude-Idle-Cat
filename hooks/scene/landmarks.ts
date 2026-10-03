import type { LandmarkKind, SceneStyle } from '../content/types'
import { landmarkFlavor } from './styles'
import { inkOf, mix } from '../theme'
import type { Flavor } from '../theme'
import type { SceneCanvas } from './canvas'
import { DESIGN, FLOOR, pen } from './fine/draw'
import type { Pen } from './fine/draw'
import type { Landmark } from '../world'

// Each landmark is drawn from x (design units) on the floor; perch heights match LANDMARK_PERCH.
const DRAWERS: Record<LandmarkKind, (p: Pen, x: number, f: Flavor, tick: number) => void> = {
  window: (p, x, f) => {
    p.rect(x + 2, FLOOR - 56, 52, 40, f.peach)
    p.rect(x + 6, FLOOR - 52, 44, 32, f.sky)
    p.rect(x + 26, FLOOR - 52, 3, 32, f.peach)
    p.rect(x + 6, FLOOR - 38, 44, 3, f.peach)
    p.rect(x, FLOOR - 16, 56, 4, f.overlay1)
  },
  shelf: (p, x, f) => {
    p.rect(x, FLOOR - 20, 56, 4, f.peach)
    p.rect(x + 8, FLOOR - 16, 4, 16, f.overlay1)
    p.rect(x + 42, FLOOR - 16, 4, 16, f.overlay1)
    p.rect(x + 40, FLOOR - 32, 8, 12, f.blue)
    p.disc(x + 49, FLOOR - 27, 3, 4, f.blue)
  },
  tower: (p, x, f, tick) => {
    const carpet = mix(f.mauve, f.surface2, 0.4)
    const rope = mix(f.yellow, f.peach, 0.5)
    p.rect(x + 2, FLOOR - 6, 44, 6, carpet)
    p.rect(x + 20, FLOOR - 24, 8, 18, rope)
    for (let y = FLOOR - 23; y < FLOOR - 6; y += 3) p.rect(x + 20, y, 8, 1, mix(rope, f.crust, 0.3))
    p.rect(x + 4, FLOOR - 28, 40, 4, carpet)
    p.rect(x + 4, FLOOR - 28, 40, 1, mix(carpet, f.rosewater, 0.35))
    const sway = tick % 16 < 8 ? 0 : 1
    p.line(x + 40, FLOOR - 24, x + 40 + sway, FLOOR - 15, inkOf(f))
    p.disc(x + 40 + sway, FLOOR - 13, 2, 2, f.red)
  },
  tunnel: (p, x, f) => {
    const fabric = mix(f.blue, f.mauve, 0.4)
    p.rect(x + 6, FLOOR - 24, 76, 24, fabric)
    p.rect(x + 6, FLOOR - 24, 76, 2, mix(fabric, f.rosewater, 0.3))
    for (let rx = x + 14; rx < x + 82; rx += 10) p.rect(rx, FLOOR - 24, 1, 24, mix(fabric, f.crust, 0.3))
    for (const cx of [x + 6, x + 82]) {
      p.disc(cx, FLOOR - 12, 6, 12, mix(fabric, f.crust, 0.2))
      p.disc(cx, FLOOR - 11, 4, 10, inkOf(f))
    }
  },
  pipe: (p, x, f) => {
    const metal = f.overlay1
    p.rect(x + 4, FLOOR - 30, 56, 30, metal)
    p.rect(x + 4, FLOOR - 30, 56, 2, mix(metal, f.text, 0.4))
    p.rect(x + 4, FLOOR - 4, 56, 4, mix(metal, f.crust, 0.35))
    for (let rx = x + 12; rx < x + 60; rx += 12) p.dot(rx, FLOOR - 24, mix(metal, f.crust, 0.5))
    for (const cx of [x + 4, x + 60]) {
      p.disc(cx, FLOOR - 15, 5, 15, f.surface2)
      p.disc(cx, FLOOR - 15, 3, 12, inkOf(f))
    }
  },
}

/** Draws unlocked landmarks on the world-wide canvas. */
export const drawLandmarks = (c: SceneCanvas, landmarks: readonly Landmark[], f: Flavor, tick: number, style?: SceneStyle) => {
  const p = pen(c)
  const colors = landmarkFlavor(style, f)
  for (const l of landmarks) {
    const x = l.x * DESIGN
    DRAWERS[l.kind]?.(p, x, colors, tick)
    const top = FLOOR - (l.kind === 'tower' ? 28 : l.kind === 'pipe' ? 30 : 24)
    if (style === 'snowy-cabin') p.rect(x + 4, top - 2, l.w * DESIGN - 8, 2, f.isLight ? f.base : f.text)
    if (style === 'neon-alley') p.rect(x + 4, top, l.w * DESIGN - 8, 1, tick % 16 < 12 ? f.pink : f.sky)
    if (style === 'space-station') for (let dx = 8; dx < l.w * DESIGN - 8; dx += 12) p.dot(x + dx, top + 3, f.yellow)
    if (style === 'beach-pier') for (let dx = 8; dx < l.w * DESIGN - 8; dx += 12) p.line(x + dx, top + 2, x + dx, top + 5, f.maroon)
  }
}
