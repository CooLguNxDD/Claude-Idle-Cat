import { mix } from '../../theme'
import type { Flavor } from '../../theme'
import type { SceneCanvas } from '../canvas'
import { FH, FLOOR, disc, dither, fw, hash, wrapF } from './draw'

/** A banded sky from `top` to `low`, the bands blended with ordered dithering. */
export const fineSky = (c: SceneCanvas, top: number, low: number) => {
  const bands = 6
  for (let y = 0; y < FH; y++) {
    const level = Math.min(1, y / FLOOR) * bands
    const band = Math.floor(level)
    const lo = mix(top, low, band / bands)
    const hi = mix(top, low, Math.min(bands, band + 1) / bands)
    for (let x = 0; x < fw(c); x++) c.fine(x, y, dither(x, y, level - band) ? hi : lo)
  }
}

export const fineSun = (c: SceneCanvas, cx: number, cy: number, color: number, f: Flavor, tick: number) => {
  const glow = mix(color, f.rosewater, 0.35)
  const pulse = tick % 32 < 16 ? 0 : 1
  disc(c, cx, cy, 9 + pulse, 9 + pulse, (x, y) => (dither(x, y, 0.35) ? glow : undefined))
  disc(c, cx, cy, 6, 6, color)
  disc(c, cx - 1.5, cy - 1.5, 3, 3, mix(color, 0xffffff, 0.35))
}

export const fineMoon = (c: SceneCanvas, cx: number, cy: number, f: Flavor, sky: number) => {
  disc(c, cx, cy, 6, 6, f.rosewater)
  disc(c, cx + 3, cy - 2, 5, 5, sky)
  for (const [dx, dy] of [[-3, 1], [-1, 3]] as const) c.fine(cx + dx, cy + dy, mix(f.rosewater, f.overlay1, 0.4))
}

export const fineStars = (c: SceneCanvas, tick: number, f: Flavor, maxX: number) => {
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 1) * maxX)
    const y = Math.floor(hash(i, 2) * 40)
    const isBright = (tick + i * 5) % 24 < 3
    c.fine(x, y, isBright ? f.text : mix(f.text, f.overlay0, hash(i, 3)))
    if (isBright) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) c.fine(x + dx, y + dy, mix(f.text, f.overlay0, 0.5))
  }
}

/** A puffy cloud: lobes over a shaded underside, with a lit crown. */
export const fineCloud = (c: SceneCanvas, x: number, y: number, size: number, color: number, f: Flavor) => {
  const shade = mix(color, f.overlay1, 0.35)
  const lobes = [[0, 2, 0.55], [0.35, 0, 0.75], [0.75, 2, 0.6], [0.45, 3, 0.7]] as const
  lobes.forEach(([fx, dy, r]) => disc(c, x + fx * size * 1.6, y + dy + size * 0.4 + 1.5, size * r, size * r * 0.7, shade))
  lobes.forEach(([fx, dy, r]) => disc(c, x + fx * size * 1.6, y + dy + size * 0.4, size * r, size * r * 0.7, color))
  disc(c, x + size * 0.55, y + size * 0.1, size * 0.35, size * 0.18, mix(color, 0xffffff, 0.3))
}

export const driftX = (start: number, tick: number, speed: number, width: number, span: number) =>
  wrapF(start + Math.floor(tick / speed), width + span) - span
