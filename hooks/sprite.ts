import type { Cat } from '../types'
import { moodOf, stageOf } from './game'
import { dayPartOf, inkOf, mix } from './theme'
import type { Flavor } from './theme'

// Scene is COLS x ROWS terminal cells; each cell is two stacked pixels ('▀').
export const COLS = 34
export const ROWS = 12
const W = COLS
const H = ROWS * 2
const UPPER_HALF = 0x2580

// Sprite letters → Catppuccin colors (ginger tabby for now).
const paletteOf = (f: Flavor): Record<string, number> => ({
  o: inkOf(f), f: f.peach, d: mix(f.peach, f.maroon, 0.5), w: f.rosewater, p: f.pink,
  E: f.green, n: f.red, r: f.red, g: f.yellow, t: f.sky,
})

const CAT = [
  '.o..........o.',
  '.oo........oo.',
  '.ofo......ofo.',
  '.offoooooooffo',
  '.offdffffdfffo',
  '.offEffffEffo.',
  '.opfffnnfffpo.',
  '..offffffffo..',
  '..ofwwwwwwfo..',
  '.ofwwwwwwwwfo.',
  '.ofwwwwwwwwfo.',
  '.offwwwwwwffo.',
  '..oooooooooo..',
]
const TAIL: [number, number][][] = [
  [[14, 8], [14, 9], [14, 10], [13, 11]],
  [[15, 9], [15, 10], [14, 11], [13, 11]],
]
const STARS: [number, number][] = [[2, 1], [7, 4], [12, 2], [19, 1], [24, 5], [29, 3], [4, 7], [16, 6]]

type Overlay = { ch: string; fg: number }


// Builds one animation frame: `tick` advances ~8 times a second.
export const frameCells = (cat: Cat, now: number, tick: number, hour: number, f: Flavor): string => {
  const PAL = paletteOf(f)
  const rainbow = (i: number) => [f.red, f.peach, f.yellow, f.green, f.blue, f.mauve][i % 6] ?? f.text
  const px = new Uint32Array(W * H)
  const put = (x: number, y: number, c: number) => {
    if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = c
  }
  const over = new Map<number, Overlay>()
  const text = (col: number, row: number, s: string, fg: number) => {
    ;[...s].forEach((ch, i) => {
      if (col + i >= 0 && col + i < COLS && row >= 0 && row < ROWS) over.set(row * COLS + col + i, { ch, fg })
    })
  }

  // Sky follows the real clock: day, dusk, night.
  const part = dayPartOf(hour)
  const isNight = part === 'night'
  const isDusk = part === 'dusk'
  const [skyTop, skyLow] = isNight ? [f.crust, f.surface0] : isDusk ? [f.mauve, f.peach]
    : [f.sapphire, mix(f.sky, f.isLight ? f.base : f.text, 0.45)]
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, mix(skyTop, skyLow, y / 20))
  if (isNight) {
    STARS.forEach(([x, y], i) => put(x, y, (tick + i * 3) % 12 < 2 ? f.overlay0 : f.text))
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] as const) put(29 + dx, 1 + dy, f.rosewater)
  } else {
    const sun = isDusk ? f.peach : f.yellow
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) put(29 + dx, 1 + dy + (isDusk ? 2 : 0), sun)
  }
  for (let y = 21; y < H; y++) for (let x = 0; x < W; x++) put(x, y, (x + y * 3) % 7 === 0 ? mix(f.peach, f.crust, 0.6) : mix(f.peach, f.crust, 0.4))

  // Food bowl, with a fish in it right after a feeding.
  const age = cat.effect ? (now - cat.effect.at) / 1000 : 99
  const fresh = (kind: string, secs: number) => cat.effect?.kind === kind && age < secs
  for (let x = 25; x <= 30; x++) put(x, 20, f.blue)
  for (let x = 26; x <= 29; x++) put(x, 21, f.blue)
  if (fresh('fish', 3)) for (let x = 26; x <= 29; x++) put(x, 19, f.peach)

  // The cat: breathing bob, blinking, mood face, stage accessories.
  const mood = moodOf(cat)
  const stage = stageOf(cat.level)
  const bob = mood === 'sleeping' ? 1 : tick % 16 < 8 ? 0 : 1
  const jump = fresh('yarn', 1.2) || fresh('levelup', 1.5) ? -Math.round(3 * Math.sin((age / 1.2) * Math.PI)) : 0
  const ox = 8
  const oy = 8 + bob + Math.min(0, jump)
  const isBlink = mood === 'sleeping' || tick % 40 < 2
  CAT.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      let c = ch
      if (c === 'E' && isBlink) c = 'o'
      if (c === 'p' && mood !== 'happy') c = 'f'
      if (y === 7 && c === 'f' && stage !== 'kitten') c = 'r'
      const color = PAL[c]
      if (color !== undefined) put(ox + x, oy + y, color)
    }),
  )
  if (mood === 'sad') put(ox + 4, oy + 6, PAL.t ?? 0)
  for (const [x, y] of TAIL[mood === 'sleeping' ? 0 : Math.floor(tick / 4) % 2] ?? []) put(ox + x, oy + y, PAL.f ?? 0)
  if (stage === 'chonk') for (const x of [4, 6, 8, 10]) put(ox + x - 1, oy - 1, PAL.g ?? 0)

  // Particles drawn as characters over the pixels.
  const headRow = Math.floor(oy / 2)
  if (mood === 'sleeping') {
    const step = tick % 24
    text(ox + 13 + (step >> 3), headRow - 1 - (step >> 3), step < 8 ? 'z' : 'Z', f.lavender)
  }
  if (fresh('hearts', 2)) [0, 4, 8].forEach((dx, i) => text(ox + 2 + dx, headRow - 1 - Math.floor(age * 2 + i * 0.5) % 4, '♥', f.red))
  if (fresh('coins', 2.5)) [3, 10, 17, 24].forEach((x, i) => text(x, (Math.floor(age * 4) + i) % 6, (tick + i) % 2 ? '*' : '+', f.yellow))
  if (fresh('fish', 1.5)) text(Math.max(25, 33 - Math.floor(age * 8)), 8, '><>', f.peach)
  if (fresh('yarn', 2)) text(2 + (Math.floor(age * 12) % 22), 10, '@', f.maroon)
  if (fresh('shop', 2)) text(10, 1, 'NEW ITEM!', rainbow(tick))
  if (fresh('levelup', 3)) [...'LEVEL UP!'].forEach((ch, i) => text(12 + i, 1, ch, rainbow(tick + i)))

  const cells = new Uint32Array(COLS * ROWS * 3)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = (r * COLS + c) * 3
      const top = px[2 * r * W + c] ?? 0
      const low = px[(2 * r + 1) * W + c] ?? 0
      const o = over.get(r * COLS + c)
      cells[i] = o ? (o.ch.codePointAt(0) ?? 32) : UPPER_HALF
      cells[i + 1] = o ? o.fg : top
      cells[i + 2] = o ? top : low
    }
  }
  return toBase64(new Uint8Array(cells.buffer))
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
