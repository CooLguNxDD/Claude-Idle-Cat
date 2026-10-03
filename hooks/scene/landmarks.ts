import type { LandmarkKind } from '../content/types'
import { inkOf, mix } from '../theme'
import type { Flavor } from '../theme'
import type { SceneCanvas } from './canvas'
import { DESIGN, FLOOR, pen } from './fine/draw'
import type { Pen } from './fine/draw'
import type { Landmark } from '../world'

// Each landmark is drawn from x (design units) on the floor; perch heights match LANDMARK_PERCH.
const DRAWERS: Record<LandmarkKind, (p: Pen, x: number, f: Flavor, tick: number) => void> = {
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
export const drawLandmarks = (c: SceneCanvas, landmarks: readonly Landmark[], f: Flavor, tick: number) => {
  const p = pen(c)
  for (const l of landmarks) DRAWERS[l.kind](p, l.x * DESIGN, f, tick)
}
