import { FLOOR_Y, HEIGHT } from '../canvas'
import type { SceneCanvas } from '../canvas'

// Art is specified on a design grid of DESIGN units per scene pixel and rendered at whatever scale the canvas has.
export const DESIGN = 4
export const FLOOR = FLOOR_Y * DESIGN
export const FH = HEIGHT * DESIGN

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
/** True on a 4x4 ordered-dither pattern for coverage `t` (0 to 1), in device pixels. */
export const dither = (x: number, y: number, t: number) => (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16 < t

/** A small deterministic hash in [0, 1) for scattering grass, pebbles and stars. */
export const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}
export const wrapF = (x: number, width: number) => ((x % width) + width) % width

// A colour, or one picked per device pixel (dx, dy) at design point (x, y); undefined leaves it.
export type Ink = number | ((dx: number, dy: number, x: number, y: number) => number | undefined)
const inkAt = (ink: Ink, dx: number, dy: number, x: number, y: number) => (typeof ink === 'number' ? ink : ink(dx, dy, x, y))

/** Draws design-grid shapes onto a canvas at its scale: `u` device pixels per design unit. */
export type Pen = {
  u: number
  /** Width of the scene in design units. */
  W: number
  rect: (x: number, y: number, w: number, h: number, ink: Ink) => void
  dot: (x: number, y: number, ink: Ink) => void
  disc: (cx: number, cy: number, rx: number, ry: number, ink: Ink) => void
  line: (x0: number, y0: number, x1: number, y1: number, ink: Ink) => void
  /** One device pixel, for art that rasterizes its own shapes. */
  px: (dx: number, dy: number, color: number) => void
  /** Every device pixel of a design-unit band, for gradients and textures that stay crisp at any scale. */
  fill: (y0: number, y1: number, ink: Ink) => void
}

export const pen = (c: SceneCanvas): Pen => {
  const u = c.scale / DESIGN
  const W = c.w * DESIGN
  const rect = (x: number, y: number, w: number, h: number, ink: Ink) => {
    const x0 = Math.round(x * u)
    const y0 = Math.round(y * u)
    const x1 = Math.max(x0 + 1, Math.round((x + w) * u))
    const y1 = Math.max(y0 + 1, Math.round((y + h) * u))
    for (let dy = y0; dy < y1; dy++) for (let dx = x0; dx < x1; dx++) {
      const v = inkAt(ink, dx, dy, dx / u, dy / u)
      if (v !== undefined) c.fine(dx, dy, v)
    }
  }
  return {
    u,
    W,
    rect,
    dot: (x, y, ink) => rect(x, y, 1, 1, ink),
    px: (dx, dy, color) => c.fine(dx, dy, color),
    disc: (cx, cy, rx, ry, ink) => {
      for (let dy = Math.floor((cy - ry) * u); dy <= Math.ceil((cy + ry) * u); dy++)
        for (let dx = Math.floor((cx - rx) * u); dx <= Math.ceil((cx + rx) * u); dx++) {
          const x = (dx + 0.5) / u
          const y = (dy + 0.5) / u
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue
          const v = inkAt(ink, dx, dy, x, y)
          if (v !== undefined) c.fine(dx, dy, v)
        }
    },
    line: (x0, y0, x1, y1, ink) => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * Math.max(1, u)
      for (let i = 0; i <= steps; i++) rect(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), 1, 1, ink)
    },
    fill: (y0, y1, ink) => {
      for (let dy = Math.round(y0 * u); dy < Math.round(y1 * u); dy++) for (let dx = 0; dx < c.w * c.scale; dx++) {
        const v = inkAt(ink, dx, dy, dx / u, dy / u)
        if (v !== undefined) c.fine(dx, dy, v)
      }
    },
  }
}
