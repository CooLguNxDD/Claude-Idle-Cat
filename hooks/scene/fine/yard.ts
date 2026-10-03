import { mix } from '../../theme'
import type { Flavor } from '../../theme'
import type { SceneCanvas } from '../canvas'
import { FH, FLOOR, S, disc, dither, fw, hash, rect } from './draw'
import { driftX, fineCloud, fineMoon, fineStars, fineSun, fineSky } from './sky'

export type FineYard = { top: number; low: number; isNight: boolean; isDusk: boolean; isSunVisible: boolean;
  hasClouds: boolean; isWinter: boolean; hasLights: boolean }

/** The sky, sun or moon and drifting clouds behind the fence. */
export const fineYardSky = (c: SceneCanvas, y: FineYard, tick: number, f: Flavor) => {
  fineSky(c, y.top, y.low)
  const sx = fw(c) - 14
  if (y.isNight && y.isSunVisible) {
    fineStars(c, tick, f, fw(c) - 24)
    fineMoon(c, sx, 9, f, y.top)
  } else if (y.isSunVisible) fineSun(c, sx, y.isDusk ? 17 : 10, y.isDusk ? f.peach : f.yellow, f, tick)
  if (y.hasClouds) {
    const cloud = f.isLight ? f.base : mix(f.text, f.sky, 0.3)
    fineCloud(c, driftX(12, tick, 6, fw(c), 40), 10, 9, cloud, f)
    fineCloud(c, driftX(fw(c) - 90, tick, 9, fw(c), 40), 16, 6, cloud, f)
  }
}

/** The wooden fence, grass and soil, with snow caps and festival lights. */
export const fineYardGround = (c: SceneCanvas, y: FineYard, tick: number, f: Flavor) => {
  const w = fw(c)
  const wood = mix(f.peach, f.surface2, 0.55)
  const woodLit = mix(wood, f.rosewater, 0.25)
  const woodDark = mix(wood, f.crust, 0.3)
  for (const ry of [15 * S - 1, 18 * S - 1]) {
    rect(c, 0, ry, w, 4, wood)
    rect(c, 0, ry, w, 1, woodLit)
    rect(c, 0, ry + 3, w, 1, woodDark)
  }
  for (let x = 0; x < w; x += 6 * S) {
    rect(c, x, 14 * S, 4, FLOOR - 14 * S, mix(wood, f.crust, 0.18))
    rect(c, x, 14 * S, 1, FLOOR - 14 * S, woodLit)
    rect(c, x + 3, 14 * S, 1, FLOOR - 14 * S, woodDark)
    rect(c, x, 14 * S - 1, 4, 1, woodLit)
    rect(c, x + 1, 14 * S - 2, 2, 1, woodLit)
  }
  // Soil with pebbles, under a strip of grass whose blades sway a pixel.
  const soil = mix(f.peach, f.crust, 0.45)
  for (let gy = FLOOR; gy < FH; gy++) for (let x = 0; x < w; x++) {
    const n = hash(x >> 1, gy >> 1)
    c.fine(x, gy, n < 0.06 ? mix(soil, f.rosewater, 0.25) : n > 0.93 ? mix(soil, f.crust, 0.35) : dither(x, gy, (gy - FLOOR) / 14) ? mix(soil, f.crust, 0.12) : soil)
  }
  const grass = y.isWinter ? (f.isLight ? f.base : f.text) : mix(f.green, f.crust, f.isLight ? 0.1 : 0.25)
  const blade = y.isWinter ? mix(f.sky, f.base, 0.6) : mix(f.green, f.yellow, 0.25)
  rect(c, 0, FLOOR, w, 3, grass)
  for (let x = 0; x < w; x++) {
    const h = Math.floor(hash(x, 7) * 4)
    const sway = (tick >> 3) % 2 && hash(x, 9) > 0.7 ? 1 : 0
    for (let i = 1; i <= h; i++) c.fine(x + (i === h ? sway : 0), FLOOR - i, i === h ? blade : grass)
  }
  if (y.isWinter) for (let x = 0; x < w; x++) {
    const cap = f.isLight ? f.base : f.text
    rect(c, x, 15 * S - 2 - (hash(x >> 2, 3) > 0.6 ? 1 : 0), 1, 2, cap)
  }
  if (y.hasLights) for (let x = 2; x < w; x += 12) {
    const bulb = [f.red, f.green, f.yellow, f.blue][((x / 12) | 0) + (tick >> 2) & 3] ?? f.red
    c.fine(x, 14 * S + 1 + (x % 24 ? 1 : 0), inkColor(f))
    disc(c, x + 0.5, 14 * S + 4 + (x % 24 ? 1 : 0), 1.6, 2, bulb)
  }
}

const inkColor = (f: Flavor) => (f.isLight ? f.text : f.crust)
