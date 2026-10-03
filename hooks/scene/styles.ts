import type { SceneStyle } from '../content/types'
import { mix } from '../theme'
import type { Flavor } from '../theme'
import { DESIGN, FH, FLOOR, hash } from './fine/draw'
import type { Pen } from './fine/draw'
import { fineYardSky } from './fine/yard'
import type { FineYard } from './fine/yard'
import { fineSky, fineStars } from './fine/sky'

/** Themed sky colors blend with live conditions instead of replacing the weather. */
export const worldSky = (style: SceneStyle, top: number, low: number, f: Flavor, isNight: boolean, hasWeather: boolean): [number, number] => {
  const colors: Record<SceneStyle, [number, number]> = {
    'snowy-cabin': [isNight ? f.surface0 : f.blue, isNight ? f.overlay0 : mix(f.sky, f.text, 0.6)],
    'neon-alley': [isNight ? f.crust : f.mauve, mix(f.mauve, f.peach, isNight ? 0.15 : 0.5)],
    'space-station': [f.crust, mix(f.base, f.blue, isNight ? 0.12 : 0.25)],
    'beach-pier': [isNight ? f.surface0 : f.sapphire, isNight ? f.base : mix(f.sky, f.rosewater, 0.55)],
  }
  const pair = colors[style]
  return hasWeather ? [mix(pair[0], top, 0.55), mix(pair[1], low, 0.55)] : [mix(pair[0], top, 0.2), mix(pair[1], low, 0.2)]
}

export const styledSky = (p: Pen, style: SceneStyle, y: FineYard, tick: number, f: Flavor) => {
  if (style !== 'space-station') return fineYardSky(p, y, tick, f)
  fineSky(p, y.top, y.low)
  fineStars(p, tick, f, p.W)
  const x = p.W - 30
  p.disc(x, 20, 9, 9, mix(f.blue, f.sky, 0.4))
  p.disc(x - 3, 18, 3, 5, f.green)
  p.line(x - 15, 22, x + 16, 16, f.lavender)
}

/** Surface and rail art shares the original floor and fence coordinates. */
export const styledGround = (p: Pen, style: SceneStyle, y: FineYard, tick: number, f: Flavor) => {
  const isSnow = style === 'snowy-cabin' || y.isWinter
  const surface = style === 'snowy-cabin' ? mix(f.base, f.sky, 0.2)
    : style === 'beach-pier' ? mix(f.peach, f.surface1, 0.35)
      : style === 'space-station' ? f.surface1 : mix(f.crust, f.surface0, 0.5)
  const rail = style === 'beach-pier' || style === 'snowy-cabin' ? mix(f.peach, f.surface2, 0.5) : f.overlay1
  p.fill(FLOOR, FH, (_, __, x, yy) => {
    if (style === 'beach-pier') return x % 24 < 1 || yy % 8 < 1 ? mix(surface, f.crust, 0.4) : surface
    if (style === 'space-station') return x % 32 < 1 || yy % 8 < 1 ? f.overlay0 : surface
    return hash(Math.floor(x / 2), Math.floor(yy / 2)) > 0.94 ? mix(surface, f.text, 0.15) : surface
  })
  for (const ry of [15 * DESIGN - 1, 18 * DESIGN - 1]) {
    if (style === 'beach-pier') {
      for (let x = 0; x < p.W; x++) p.dot(x, ry + Math.round(Math.sin(x / 12) * 2), rail)
    } else {
      p.rect(0, ry, p.W, 3, rail)
      p.rect(0, ry, p.W, 1, mix(rail, f.text, 0.3))
    }
  }
  for (let x = 0; x < p.W; x += 6 * DESIGN) {
    p.rect(x, 14 * DESIGN, 4, FLOOR - 14 * DESIGN, rail)
    p.rect(x, 14 * DESIGN, 1, FLOOR - 14 * DESIGN, mix(rail, f.text, 0.25))
    if (style === 'space-station') p.rect(x, 18 * DESIGN, 4, 3, f.yellow)
  }
  if (style === 'neon-alley') {
    p.rect(0, 15 * DESIGN + 2, p.W, 1, f.pink)
    p.rect(0, FLOOR, p.W, 1, f.sky)
  }
  if (isSnow) {
    const snow = f.isLight ? f.base : f.text
    p.rect(0, FLOOR, p.W, 3, snow)
    for (let x = 0; x < p.W; x++) p.rect(x, 15 * DESIGN - 2 - (hash(x >> 2, 3) > 0.6 ? 1 : 0), 1, 2, snow)
  }
  if (y.hasLights) for (let x = 2; x < p.W; x += 12) {
    const bulb = [f.red, f.green, f.yellow, f.blue][(((x / 12) | 0) + (tick >> 2)) & 3] ?? f.red
    p.disc(x, 14 * DESIGN + 4, 1.6, 2, bulb)
  }
}

// Only landmark palette tokens change; coat and furniture palettes are untouched.
export const landmarkFlavor = (style: SceneStyle | undefined, f: Flavor): Flavor => {
  if (style === 'snowy-cabin') return { ...f, mauve: f.peach, blue: f.green, overlay1: f.surface2 }
  if (style === 'neon-alley') return { ...f, mauve: f.pink, yellow: f.sky, blue: f.mauve, overlay1: f.sapphire }
  if (style === 'space-station') return { ...f, mauve: f.overlay1, peach: f.overlay2, blue: f.surface2, overlay1: f.overlay0 }
  if (style === 'beach-pier') return { ...f, mauve: f.peach, blue: f.teal, overlay1: mix(f.peach, f.surface2, 0.4) }
  return f
}
