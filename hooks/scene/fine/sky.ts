import { mix } from '../../theme'
import type { Flavor } from '../../theme'
import { FLOOR, FH, dither, hash, wrapF } from './draw'
import type { Pen } from './draw'

/** A banded sky from `top` to `low`, the bands blended with ordered dithering. */
export const fineSky = (p: Pen, top: number, low: number) => {
  const bands = 6
  p.fill(0, FH, (dx, dy, _x, y) => {
    const level = Math.min(1, y / FLOOR) * bands
    const band = Math.floor(level)
    return mix(top, low, Math.min(bands, band + (dither(dx, dy, level - band) ? 1 : 0)) / bands)
  })
}

export const fineSun = (p: Pen, cx: number, cy: number, color: number, f: Flavor, tick: number) => {
  const glow = mix(color, f.rosewater, 0.35)
  const pulse = tick % 32 < 16 ? 0 : 1
  p.disc(cx, cy, 9 + pulse, 9 + pulse, (dx, dy) => (dither(dx, dy, 0.35) ? glow : undefined))
  p.disc(cx, cy, 6, 6, color)
  p.disc(cx - 1.5, cy - 1.5, 3, 3, mix(color, 0xffffff, 0.35))
}

export const fineMoon = (p: Pen, cx: number, cy: number, f: Flavor, sky: number) => {
  p.disc(cx, cy, 6, 6, f.rosewater)
  p.disc(cx + 3, cy - 2, 5, 5, sky)
  for (const [dx, dy] of [[-3, 1], [-1, 3]] as const) p.dot(cx + dx, cy + dy, mix(f.rosewater, f.overlay1, 0.4))
}

export const fineStars = (p: Pen, tick: number, f: Flavor, maxX: number) => {
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 1) * maxX)
    const y = Math.floor(hash(i, 2) * 40)
    const isBright = (tick + i * 5) % 24 < 3
    p.dot(x, y, isBright ? f.text : mix(f.text, f.overlay0, hash(i, 3)))
    if (isBright) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) p.dot(x + dx, y + dy, mix(f.text, f.overlay0, 0.5))
  }
}

/** A puffy cloud: lobes over a shaded underside, with a lit crown. */
export const fineCloud = (p: Pen, x: number, y: number, size: number, color: number, f: Flavor) => {
  const shade = mix(color, f.overlay1, 0.35)
  const lobes = [[0, 2, 0.55], [0.35, 0, 0.75], [0.75, 2, 0.6], [0.45, 3, 0.7]] as const
  lobes.forEach(([fx, dy, r]) => p.disc(x + fx * size * 1.6, y + dy + size * 0.4 + 1.5, size * r, size * r * 0.7, shade))
  lobes.forEach(([fx, dy, r]) => p.disc(x + fx * size * 1.6, y + dy + size * 0.4, size * r, size * r * 0.7, color))
  p.disc(x + size * 0.55, y + size * 0.1, size * 0.35, size * 0.18, mix(color, 0xffffff, 0.3))
}

export const driftX = (start: number, tick: number, speed: number, width: number, span: number) =>
  wrapF(start + Math.floor(tick / speed), width + span) - span
