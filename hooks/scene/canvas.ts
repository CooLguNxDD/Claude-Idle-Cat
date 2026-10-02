export const ROWS = 12
export const MIN_COLS = 34
export const MAX_COLS = 56
export const HEIGHT = ROWS * 2
export const FLOOR_Y = 21
const UPPER_HALF = 0x2580

export const sceneCols = (bodyColumns: number | undefined) =>
  Math.max(MIN_COLS, Math.min(MAX_COLS, (bodyColumns ?? MIN_COLS) - 2))

type Overlay = { ch: string; fg: number }
export type SceneCanvas = {
  w: number
  put: (x: number, y: number, c: number) => void
  text: (col: number, row: number, value: string, fg: number) => void
  pack: () => string
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

export const canvas = (w: number): SceneCanvas => {
  const px = new Uint32Array(w * HEIGHT)
  const over = new Map<number, Overlay>()
  return {
    w,
    put: (x, y, c) => { if (x >= 0 && x < w && y >= 0 && y < HEIGHT) px[y * w + x] = c },
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
  }
}
