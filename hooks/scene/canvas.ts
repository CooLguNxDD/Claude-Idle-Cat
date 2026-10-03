export const ROWS = 12
export const MIN_COLS = 34
export const MAX_COLS = 56
export const HEIGHT = ROWS * 2
export const FLOOR_Y = 21
const UPPER_HALF = 0x2580

export const sceneCols = (bodyColumns: number | undefined) =>
  Math.max(MIN_COLS, Math.min(MAX_COLS, (bodyColumns ?? MIN_COLS) - 2))

import { glyphPixels } from './font'

type Overlay = { ch: string; fg: number }
export type RgbaImage = { rgba: string; width: number; height: number }
export type SceneCanvas = {
  w: number
  /** Device pixels per scene pixel: 1 for half-block cells, more for a picture; `fine` draws at it. */
  scale: number
  isFine: boolean
  put: (x: number, y: number, c: number) => void
  fine: (x: number, y: number, c: number) => void
  text: (col: number, row: number, value: string, fg: number) => void
  pack: () => string
  image: (shadow: number) => RgbaImage
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const toBase64 = (bytes: Uint8Array) => {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + (i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '=') +
      (i + 2 < bytes.length ? B64[n & 63]! : '=')
  }
  return out
}

export const canvas = (w: number, scale = 1): SceneCanvas => {
  const k = Math.max(1, Math.round(scale))
  const px = new Uint32Array(w * HEIGHT)
  const fw = w * k
  const fh = HEIGHT * k
  // The scaled layer: every put fills its block, so later coarse layers still cover fine ones.
  const hi = k > 1 ? new Uint32Array(fw * fh) : null
  const over = new Map<number, Overlay>()
  return {
    w,
    scale: k,
    isFine: k > 1,
    put: (x, y, c) => {
      if (x < 0 || x >= w || y < 0 || y >= HEIGHT) return
      px[y * w + x] = c
      if (hi) for (let dy = 0; dy < k; dy++) hi.fill(c, (y * k + dy) * fw + x * k, (y * k + dy) * fw + (x + 1) * k)
    },
    fine: (x, y, c) => {
      if (x < 0 || x >= fw || y < 0 || y >= fh) return
      if (hi) hi[y * fw + x] = c
      else px[y * w + x] = c
    },
    text: (col, row, value, fg) => {
      ;[...value].forEach((ch, i) => {
        if (col + i >= 0 && col + i < w && row >= 0 && row < ROWS) over.set(row * w + col + i, { ch, fg })
      })
    },
    pack: () => {
      const cells = new Uint32Array(w * ROWS * 3)
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < w; c++) {
        const i = (r * w + c) * 3
        const top = px[2 * r * w + c] ?? 0
        const low = px[(2 * r + 1) * w + c] ?? 0
        const o = over.get(r * w + c)
        cells[i] = o ? (o.ch.codePointAt(0) ?? 32) : UPPER_HALF
        cells[i + 1] = o ? o.fg : top
        cells[i + 2] = o ? top : low
      }
      return toBase64(new Uint8Array(cells.buffer))
    },
    image: shadow => {
      const s = k
      const width = w * s
      const out = new Uint8Array(width * HEIGHT * s * 4)
      const dot = (x: number, y: number, c: number) => {
        const i = (y * width + x) * 4
        out[i] = (c >> 16) & 255
        out[i + 1] = (c >> 8) & 255
        out[i + 2] = c & 255
        out[i + 3] = 255
      }
      for (let y = 0; y < HEIGHT * s; y++) for (let x = 0; x < width; x++)
        dot(x, y, (hi ? hi[y * width + x] : px[Math.floor(y / s) * w + Math.floor(x / s)]) ?? 0)
      // Text overlays draw as pixel glyphs centred in their cell, grown in whole steps on larger scales.
      const g = Math.max(1, Math.floor(s / 4))
      const safe = (x: number, y: number, c: number) => { if (x >= 0 && x < width && y >= 0 && y < HEIGHT * s) dot(x, y, c) }
      over.forEach(({ ch, fg }, at) => {
        const x0 = (at % w) * s + ((s - 3 * g) >> 1)
        const y0 = Math.floor(at / w) * 2 * s + ((2 * s - 5 * g) >> 1)
        const lit = glyphPixels(ch)
        for (const [color, off] of [[shadow, g], [fg, 0]] as const) lit.forEach(([x, y]) => {
          for (let dy = 0; dy < g; dy++) for (let dx = 0; dx < g; dx++) safe(x0 + x * g + dx + off, y0 + y * g + dy + off, color)
        })
      })
      return { rgba: toBase64(out), width, height: HEIGHT * s }
    },
  }
}
