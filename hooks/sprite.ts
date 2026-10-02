import type { Cat } from '../types'
import { moodOf, stageOf } from './game'

// Scene is COLS x ROWS terminal cells; each cell is two stacked pixels ('▀').
export const COLS = 34
export const ROWS = 12
const W = COLS
const H = ROWS * 2
const UPPER_HALF = 0x2580

const PAL: Record<string, number> = {
  o: 0x3b2418, f: 0xf4a259, d: 0xd9803a, w: 0xfff4e6, p: 0xff8fab,
  E: 0x2d6a4f, n: 0xe5566f, r: 0xd62828, g: 0xffd60a, t: 0x8ecae6,
}

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

const mix = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t) << s
  return ch(16) | ch(8) | ch(0)
}
const rainbow = (i: number) => [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93][i % 5] ?? 0xffffff

// Builds one animation frame: `tick` advances ~8 times a second.
export const frameCells = (cat: Cat, now: number, tick: number, hour: number): string => {
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
  const isNight = hour < 6 || hour >= 20
  const isDusk = hour >= 17 && hour < 20
  const [skyTop, skyLow] = isNight ? [0x0b1026, 0x1b2550] : isDusk ? [0x6d597a, 0xffb4a2] : [0x8ecae6, 0xd7f1fb]
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, mix(skyTop, skyLow, y / 20))
  if (isNight) {
    STARS.forEach(([x, y], i) => put(x, y, (tick + i * 3) % 12 < 2 ? 0x555577 : 0xf8f8ff))
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] as const) put(29 + dx, 1 + dy, 0xf1f1d0)
  } else {
    const sun = isDusk ? 0xff7b54 : 0xffd166
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) put(29 + dx, 1 + dy + (isDusk ? 2 : 0), sun)
  }
  for (let y = 21; y < H; y++) for (let x = 0; x < W; x++) put(x, y, (x + y * 3) % 7 === 0 ? 0x6e4128 : 0x8d5a3b)

  // Food bowl, with a fish in it right after a feeding.
  const age = cat.effect ? (now - cat.effect.at) / 1000 : 99
  const fresh = (kind: string, secs: number) => cat.effect?.kind === kind && age < secs
  for (let x = 25; x <= 30; x++) put(x, 20, 0x1d4e89)
  for (let x = 26; x <= 29; x++) put(x, 21, 0x1d4e89)
  if (fresh('fish', 3)) for (let x = 26; x <= 29; x++) put(x, 19, 0xf77f00)

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
    text(ox + 13 + (step >> 3), headRow - 1 - (step >> 3), step < 8 ? 'z' : 'Z', 0xffffff)
  }
  if (fresh('hearts', 2)) [0, 4, 8].forEach((dx, i) => text(ox + 2 + dx, headRow - 1 - Math.floor(age * 2 + i * 0.5) % 4, '♥', 0xff4d6d))
  if (fresh('coins', 2.5)) [3, 10, 17, 24].forEach((x, i) => text(x, (Math.floor(age * 4) + i) % 6, (tick + i) % 2 ? '*' : '+', 0xffd60a))
  if (fresh('fish', 1.5)) text(Math.max(25, 33 - Math.floor(age * 8)), 8, '><>', 0xf77f00)
  if (fresh('yarn', 2)) text(2 + (Math.floor(age * 12) % 22), 10, '@', 0xe63946)
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
