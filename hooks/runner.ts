import type { Cat } from '../types'
import { coatPixel } from './genes'
import { mix } from './theme'
import type { Flavor } from './theme'

// The running-cat band: RUN_ROWS terminal rows, two pixels per row ('▀' / '▄'), the terminal's own background showing through.
export const RUN_ROWS = 5
export const RUN_MAX_COLS = 72
export const SPRITE_W = 13
const H = RUN_ROWS * 2
const GROUND = H - 1
const NONE = 0x01000000
const UPPER = 0x2580
const LOWER = 0x2584

// Side view facing right, 13x6. f fur, d stripe, w belly, E eye, n nose. Legs and tail change per frame.
const BODY = [
  '.........f.f.',
  '........fffff',
  '..ffffffEfffn',
  '..fdfdfwwwfff',
]
type Px = [number, number]
// Gallop: stretched out, gathered, crossed, pushing off. The tail swings between frames.
const FRAMES: { legs: Px[]; tail: Px[]; isAir: boolean }[] = [
  { isAir: true, legs: [[2, 4], [1, 5], [0, 5], [10, 4], [11, 5], [12, 5]], tail: [[1, 3], [0, 2], [0, 1]] },
  { isAir: false, legs: [[4, 4], [4, 5], [3, 5], [8, 4], [8, 5], [9, 5]], tail: [[1, 3], [0, 3], [0, 2]] },
  { isAir: true, legs: [[5, 4], [6, 5], [7, 5], [7, 4], [6, 4], [5, 5]], tail: [[1, 3], [0, 3], [-1, 3]] },
  { isAir: false, legs: [[2, 4], [3, 5], [2, 5], [9, 4], [9, 5], [10, 5]], tail: [[1, 3], [0, 2], [0, 1]] },
]
const FISH: Px[] = [[0, 1], [1, 0], [2, 0], [3, 1], [1, 2], [2, 2], [4, 0], [4, 2]]
export const FISH_W = 5

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

export type RunInput = { cat: Pick<Cat, 'genes'>; flavor: Flavor; tick: number; x: number; cols: number; isSprint: boolean; isAway?: boolean }

// Where the cat is next frame: it runs right and wraps once it reaches the fish.
export const nextX = (x: number, cols: number, isSprint: boolean): number => {
  const end = cols - SPRITE_W - FISH_W - 5
  const moved = x + (isSprint ? 3 : 1)
  return moved > end ? 0 : moved
}

// The grid as pixels (NONE = see-through), so tests can read a frame without decoding cells.
export const runPixels = ({ cat, flavor: f, tick, x, cols, isSprint, isAway }: RunInput): Uint32Array => {
  const px = new Uint32Array(cols * H).fill(NONE)
  const put = (a: number, b: number, c: number) => {
    if (a >= 0 && a < cols && b >= 0 && b < H) px[b * cols + a] = c
  }
  for (let i = 0; i < cols; i++) if ((i + 1) % 4 < 2) put(i, GROUND, f.surface2)

  if (isAway) {
    for (let step = 0; step < cols; step += 12) {
      const x = (step + tick) % cols, y = step % 24 ? 5 : 3
      for (const [dx, dy] of [[0, 0], [2, 0], [1, 2], [2, 2], [1, 3]]) put(x + dx!, y + dy!, f.mauve)
    }
    return px
  }
  const ox = x + 3
  const frame = FRAMES[tick % FRAMES.length] as (typeof FRAMES)[number]
  const oy = frame.isAir ? 2 : 3
  const mask = new Set<number>()
  const body = new Map<number, number>()
  const add = (a: number, b: number, color: number, isOutlined = true) => {
    body.set((oy + b) * 1000 + (ox + a), color)
    if (isOutlined) mask.add((oy + b) * 1000 + (ox + a))
  }
  BODY.forEach((row, b) =>
    [...row].forEach((ch, a) => {
      const color = ch === 'n' ? f.red : ch === 'E' ? (tick % 40 < 2 ? f.overlay1 : coatPixel(cat.genes, f, 'E', a, b)) : coatPixel(cat.genes, f, ch, a, b + 3)
      if (color !== undefined) add(a, b, color)
    }),
  )
  const fur = coatPixel(cat.genes, f, 'f', 6, 3) ?? f.peach
  for (const [a, b] of [...frame.legs, ...frame.tail]) add(a, b, fur, false)

  // Outline the head and torso in a color that reads on light and dark terminals; legs and tail stay thin.
  const edge = mix(f.overlay0, f.text, 0.15)
  for (const key of mask) {
    for (const d of [-1000, 1000, -1, 1]) if (!mask.has(key + d)) put((key + d) % 1000, Math.floor((key + d) / 1000), edge)
  }
  for (const [key, color] of body) put(key % 1000, Math.floor(key / 1000), color)

  // Dust where paws land, speed lines while sprinting.
  if (!frame.isAir) for (const [a, b] of [[-2, 0], [-3, -1], [-1, 0]] as Px[]) put(ox + a, GROUND - 1 + b, f.overlay1)
  if (isSprint) for (const row of [3, 5, 7]) for (let k = 2; k < 7; k++) if ((k + row + tick) % 3) put(ox - k, row, f.overlay0)

  // The fish waits at the end of the track until the cat gets there.
  const fx = cols - FISH_W - 1
  if (ox + SPRITE_W < fx - 1) for (const [a, b] of FISH) put(fx + a, GROUND - 3 + b, a === 0 && b === 1 ? f.sky : f.peach)
  return px
}

// Encodes pixels as Raster cells: [code point, foreground, background] triplets, base64.
export const runFrame = (input: RunInput): string => {
  const { cols } = input
  const px = runPixels(input)
  const cells = new Uint32Array(cols * RUN_ROWS * 3)
  for (let r = 0; r < RUN_ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const top = px[2 * r * cols + c] ?? NONE
      const low = px[(2 * r + 1) * cols + c] ?? NONE
      const i = (r * cols + c) * 3
      const isBoth = top !== NONE && low !== NONE
      cells[i] = top === NONE && low === NONE ? 32 : top === NONE ? LOWER : UPPER
      cells[i + 1] = top === NONE ? (low === NONE ? NONE : low) : top
      cells[i + 2] = isBoth ? low : NONE
    }
  }
  return toBase64(new Uint8Array(cells.buffer))
}
