import { FLOOR_Y, HEIGHT, IMAGE_SCALE } from '../canvas'
import type { SceneCanvas } from '../canvas'

// Fine-pixel geometry for the 4x picture canvas.
export const S = IMAGE_SCALE
export const FLOOR = FLOOR_Y * S
export const FH = HEIGHT * S
export const fw = (c: SceneCanvas) => c.w * S

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
/** True on a 4x4 ordered-dither pattern for coverage `t` (0 to 1). */
export const dither = (x: number, y: number, t: number) => (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16 < t

export const disc = (c: SceneCanvas, cx: number, cy: number, rx: number, ry: number, color: number | ((x: number, y: number) => number | undefined)) => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx
    const dy = (y + 0.5 - cy) / ry
    if (dx * dx + dy * dy > 1) continue
    const v = typeof color === 'number' ? color : color(x, y)
    if (v !== undefined) c.fine(x, y, v)
  }
}

export const rect = (c: SceneCanvas, x0: number, y0: number, w: number, h: number, color: number) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) c.fine(x, y, color)
}

export const line = (c: SceneCanvas, x0: number, y0: number, x1: number, y1: number, color: number) => {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= steps; i++) c.fine(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), color)
}

export const wrapF = (x: number, width: number) => ((x % width) + width) % width
/** A small deterministic hash in [0, 1) for scattering grass, pebbles and stars. */
export const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}
