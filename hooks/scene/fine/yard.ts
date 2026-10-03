import { mix } from '../../theme'
import type { Flavor } from '../../theme'
import { DESIGN, FH, FLOOR, dither, hash } from './draw'
import type { Pen } from './draw'
import { driftX, fineCloud, fineMoon, fineStars, fineSun, fineSky } from './sky'

export type FineYard = { top: number; low: number; isNight: boolean; isDusk: boolean; isSunVisible: boolean;
  hasClouds: boolean; isWinter: boolean; hasLights: boolean }

/** The sky, sun or moon and drifting clouds behind the fence. */
export const fineYardSky = (p: Pen, y: FineYard, tick: number, f: Flavor) => {
  fineSky(p, y.top, y.low)
  const sx = p.W - 14
  if (y.isNight && y.isSunVisible) {
    fineStars(p, tick, f, p.W - 24)
    fineMoon(p, sx, 9, f, y.top)
  } else if (y.isSunVisible) fineSun(p, sx, y.isDusk ? 17 : 10, y.isDusk ? f.peach : f.yellow, f, tick)
  if (y.hasClouds) {
    const cloud = f.isLight ? f.base : mix(f.text, f.sky, 0.3)
    fineCloud(p, driftX(12, tick, 6, p.W, 40), 10, 9, cloud, f)
    fineCloud(p, driftX(p.W - 90, tick, 9, p.W, 40), 16, 6, cloud, f)
  }
}

/** The wooden fence, grass and soil, with snow caps and festival lights. */
export const fineYardGround = (p: Pen, y: FineYard, tick: number, f: Flavor) => {
  const S = DESIGN
  const wood = mix(f.peach, f.surface2, 0.55)
  const woodLit = mix(wood, f.rosewater, 0.25)
  const woodDark = mix(wood, f.crust, 0.3)
  for (const ry of [15 * S - 1, 18 * S - 1]) {
    p.rect(0, ry, p.W, 4, wood)
    p.rect(0, ry, p.W, 1, woodLit)
    p.rect(0, ry + 3, p.W, 1, woodDark)
  }
  for (let x = 0; x < p.W; x += 6 * S) {
    p.rect(x, 14 * S, 4, FLOOR - 14 * S, mix(wood, f.crust, 0.18))
    p.rect(x, 14 * S, 1, FLOOR - 14 * S, woodLit)
    p.rect(x + 3, 14 * S, 1, FLOOR - 14 * S, woodDark)
    p.rect(x, 14 * S - 1, 4, 1, woodLit)
    p.rect(x + 1, 14 * S - 2, 2, 1, woodLit)
  }
  // Soil with pebbles, under a strip of grass whose blades sway a unit.
  const soil = mix(f.peach, f.crust, 0.45)
  p.fill(FLOOR, FH, (dx, dy, gx, gy) => {
    const n = hash(Math.floor(gx / 2), Math.floor(gy / 2))
    return n < 0.06 ? mix(soil, f.rosewater, 0.25) : n > 0.93 ? mix(soil, f.crust, 0.35)
      : dither(dx, dy, (gy - FLOOR) / 14) ? mix(soil, f.crust, 0.12) : soil
  })
  const grass = y.isWinter ? (f.isLight ? f.base : f.text) : mix(f.green, f.crust, f.isLight ? 0.1 : 0.25)
  const blade = y.isWinter ? mix(f.sky, f.base, 0.6) : mix(f.green, f.yellow, 0.25)
  p.rect(0, FLOOR, p.W, 3, grass)
  for (let x = 0; x < p.W; x++) {
    const h = Math.floor(hash(x, 7) * 4)
    const sway = (tick >> 3) % 2 && hash(x, 9) > 0.7 ? 1 : 0
    for (let i = 1; i <= h; i++) p.dot(x + (i === h ? sway : 0), FLOOR - i, i === h ? blade : grass)
  }
  if (y.isWinter) for (let x = 0; x < p.W; x++)
    p.rect(x, 15 * S - 2 - (hash(x >> 2, 3) > 0.6 ? 1 : 0), 1, 2, f.isLight ? f.base : f.text)
  if (y.hasLights) for (let x = 2; x < p.W; x += 12) {
    const bulb = [f.red, f.green, f.yellow, f.blue][(((x / 12) | 0) + (tick >> 2)) & 3] ?? f.red
    p.dot(x, 14 * S + 1 + (x % 24 ? 1 : 0), f.isLight ? f.text : f.crust)
    p.disc(x + 0.5, 14 * S + 4 + (x % 24 ? 1 : 0), 1.6, 2, bulb)
  }
}
