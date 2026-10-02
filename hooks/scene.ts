import type { Cat, Home } from '../types'
import { activeCat, moodOf, stageOf } from './game'
import { coatPixel } from './genes'
import { tierOf } from './home'
import { formOf } from './skills'
import type { Form } from './skills'
import { dayPartOf, inkOf, mix } from './theme'
import type { Flavor } from './theme'

// The scene is cols x ROWS terminal cells; each cell is two stacked pixels ('▀').
export const ROWS = 12
export const MIN_COLS = 34
export const MAX_COLS = 56
const H = ROWS * 2
const FLOOR_Y = 21
const UPPER_HALF = 0x2580

export const sceneCols = (bodyColumns: number | undefined) =>
  Math.max(MIN_COLS, Math.min(MAX_COLS, (bodyColumns ?? MIN_COLS) - 2))

// Big cat, 14x13. o outline, f/d fur and stripes, w belly, E eyes, p cheeks, n nose.
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
// Small cat for the rest of the household, 6x5.
const MINI = [
  'o...o.',
  'fffff.',
  'fEfEf.',
  'fwwwff',
  'fwwwf.',
]
const STARS: [number, number][] = [[2, 1], [7, 4], [12, 2], [19, 1], [24, 5], [4, 7], [16, 6], [38, 2], [45, 5], [51, 1]]

type Overlay = { ch: string; fg: number }
export type SceneInput = { home: Home; now: number; tick: number; hour: number; flavor: Flavor; cols: number }

// Builds one animation frame: `tick` advances ~8 times a second.
export const frameCells = ({ home, now, tick, hour, flavor: f, cols }: SceneInput): string => {
  const W = cols
  const ink = inkOf(f)
  const rainbow = (i: number) => [f.red, f.peach, f.yellow, f.green, f.blue, f.mauve][i % 6] ?? f.text
  const px = new Uint32Array(W * H)
  const put = (x: number, y: number, c: number) => {
    if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = c
  }
  const over = new Map<number, Overlay>()
  const text = (col: number, row: number, s: string, fg: number) => {
    ;[...s].forEach((ch, i) => {
      if (col + i >= 0 && col + i < cols && row >= 0 && row < ROWS) over.set(row * cols + col + i, { ch, fg })
    })
  }

  // Sky follows the real clock: day, dusk, night.
  const part = dayPartOf(hour)
  const isNight = part === 'night'
  const isDusk = part === 'dusk'
  const [skyTop, skyLow] = isNight ? [f.crust, f.surface0] : isDusk ? [f.mauve, f.peach]
    : [f.sapphire, mix(f.sky, f.isLight ? f.base : f.text, 0.45)]
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, mix(skyTop, skyLow, y / 20))
  const sx = W - 5
  if (isNight) {
    STARS.forEach(([x, y], i) => x < W - 6 && put(x, y, (tick + i * 3) % 12 < 2 ? f.overlay0 : f.text))
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] as const) put(sx + dx, 1 + dy, f.rosewater)
  } else {
    const sun = isDusk ? f.peach : f.yellow
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) put(sx + dx, 1 + dy + (isDusk ? 2 : 0), sun)
  }
  // Back fence: strays and spare cats sit on top of it.
  const wood = mix(f.peach, f.surface2, 0.55)
  for (let x = 0; x < W; x++) {
    for (const y of [15, 18]) put(x, y, wood)
    if (x % 6 === 0) for (let y = 14; y < FLOOR_Y; y++) put(x, y, mix(wood, f.crust, 0.25))
  }
  for (let y = FLOOR_Y; y < H; y++) {
    for (let x = 0; x < W; x++) put(x, y, (x + y * 3) % 7 === 0 ? mix(f.peach, f.crust, 0.6) : mix(f.peach, f.crust, 0.4))
  }

  const age = home.effect ? (now - home.effect.at) / 1000 : 99
  const fresh = (kind: string, secs: number) => home.effect?.kind === kind && age < secs
  const bx = W - 9
  drawDecor(home, W, bx, tick, isNight, fresh('fish', 3), f, put)

  // One spare cat naps on the bed; other spare cats and visiting strays sit on the fence.
  const cat = activeCat(home)
  const others = home.cats.filter(c => c.id !== cat.id)
  if (others[0]) drawMini(others[0], 1, FLOOR_Y - 5, tick, f, put)
  const fence = [26, 33, 40, 47].filter(x => x + 6 < W - 6)
  const sitters = [...others.slice(1), ...home.visitors]
  sitters.slice(0, fence.length).forEach((c, i) => drawMini(c, fence[i] ?? 26, 9, tick + i * 7, f, put))

  // The active cat: breathing bob, blinking, mood face, stage accessories.
  const mood = moodOf(cat)
  const stage = stageOf(cat.level)
  const bob = mood === 'sleeping' ? 1 : tick % 16 < 8 ? 0 : 1
  const jump = fresh('yarn', 1.2) || fresh('levelup', 1.5) || fresh('adopt', 1.5) || fresh('evolve', 1.5) || fresh('welcome', 2)
    ? -Math.round(3 * Math.sin((age / 1.2) * Math.PI)) : 0
  const ox = 8
  const oy = 8 + bob + Math.min(0, jump)
  const isBlink = mood === 'sleeping' || tick % 40 < 2
  const form = formOf(cat)
  drawFormBack(form, ox, oy, tick, f, put)
  CAT.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      let c = ch
      if (c === 'E' && isBlink) c = 'o'
      if (c === 'p' && mood !== 'happy') c = 'f'
      if (y === 7 && c === 'f' && stage !== 'kitten') return put(ox + x, oy + y, f.red)
      if (c === 'o') return put(ox + x, oy + y, ink)
      if (c === 'p') return put(ox + x, oy + y, f.pink)
      if (c === 'n') return put(ox + x, oy + y, f.red)
      const color = coatPixel(cat.genes, f, c, x, y)
      if (color !== undefined) put(ox + x, oy + y, color)
    }),
  )
  // Grumpy cats get flat brows over the eyes.
  if (mood === 'grumpy') for (const x of [3, 4, 8, 9]) put(ox + x, oy + 4, ink)
  const tailColor = coatPixel(cat.genes, f, 'f', 12, 10) ?? f.peach
  for (const [x, y] of TAIL[mood === 'sleeping' ? 0 : Math.floor(tick / 4) % 2] ?? []) put(ox + x, oy + y, tailColor)
  drawFormFront(form, ox, oy, tick, f, put)

  // Particles drawn as characters over the pixels.
  const headRow = Math.floor(oy / 2)
  if (mood === 'sleeping') {
    const step = tick % 24
    text(ox + 13 + (step >> 3), headRow - 1 - (step >> 3), step < 8 ? 'z' : 'Z', f.lavender)
  }
  if (cat.genes.isShiny && tick % 24 < 6) text(ox + (tick % 3) * 5, headRow + 1 + (tick % 2), '*', f.mauve)
  if (fresh('hearts', 2) || fresh('gift', 2.5)) {
    ;[0, 4, 8].forEach((dx, i) => text(ox + 2 + dx, headRow - 1 - (Math.floor(age * 2 + i * 0.5) % 4), '♥', f.red))
  }
  if (fresh('coins', 2.5)) {
    ;[3, 10, 17, 24].forEach((x, i) => text(x, (Math.floor(age * 4) + i) % 6, (tick + i) % 2 ? '*' : '+', f.yellow))
  }
  if (fresh('fish', 1.5)) text(Math.max(bx, cols - 1 - Math.floor(age * 8)), 8, '><>', f.peach)
  if (fresh('yarn', 2)) text(2 + (Math.floor(age * 12) % 22), 10, '@', f.maroon)
  if (fresh('shop', 2)) text(10, 1, 'NEW ITEM!', rainbow(tick))
  if (fresh('adopt', 3)) [...'WELCOME!'].forEach((ch, i) => text(11 + i, 1, ch, rainbow(tick + i)))
  if (fresh('catch', 3)) text(ox + 6, headRow - 2 - (Math.floor(age * 2) % 2), '!', f.yellow)
  if (fresh('award', 4)) [...'ACHIEVEMENT!'].forEach((ch, i) => text(10 + i, 0, ch, rainbow(tick + i)))
  if (fresh('welcome', 4)) [...'WELCOME BACK!'].forEach((ch, i) => text(10 + i, 1, ch, rainbow(tick + i)))
  if (fresh('evolve', 3)) [...'EVOLVED!'].forEach((ch, i) => text(12 + i, 1, ch, rainbow(tick + i)))
  if (fresh('levelup', 3)) [...'LEVEL UP!'].forEach((ch, i) => text(12 + i, 1, ch, rainbow(tick + i)))

  const cells = new Uint32Array(cols * ROWS * 3)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 3
      const top = px[2 * r * W + c] ?? 0
      const low = px[(2 * r + 1) * W + c] ?? 0
      const o = over.get(r * cols + c)
      cells[i] = o ? (o.ch.codePointAt(0) ?? 32) : UPPER_HALF
      cells[i + 1] = o ? o.fg : top
      cells[i + 2] = o ? top : low
    }
  }
  return toBase64(new Uint8Array(cells.buffer))
}

type Put = (x: number, y: number, c: number) => void

// Behind the body: cape (royal), wings (cloud), extra belly (chonk).
const drawFormBack = (form: Form | null, ox: number, oy: number, tick: number, f: Flavor, put: Put) => {
  if (form === 'royal') for (let y = 8; y <= 12; y++) for (const x of [0, 1, 12, 13]) put(ox + x, oy + y, f.mauve)
  if (form === 'cloud') {
    const lift = tick % 8 < 4 ? 0 : 1
    for (const [x, y] of [[-2, 7], [-1, 7], [-3, 8], [-2, 8], [-1, 8], [-2, 9]] as const) {
      put(ox + x, oy + y - lift, f.lavender)
      put(ox + 13 - x, oy + y - lift, f.lavender)
    }
  }
  if (form === 'chonk') for (let y = 8; y <= 11; y++) for (const x of [0, 13]) put(ox + x, oy + y, inkOf(f))
}

// In front: headband and flapping ribbon (ninja), crown (royal), halo (cloud).
const drawFormFront = (form: Form | null, ox: number, oy: number, tick: number, f: Flavor, put: Put) => {
  if (form === 'ninja') {
    for (let x = 2; x <= 11; x++) put(ox + x, oy + 3, f.red)
    const flap = tick % 6 < 3 ? 0 : 1
    put(ox + 13, oy + 3 + flap, f.red)
    put(ox + 14, oy + 4 - flap, f.red)
  }
  if (form === 'royal') {
    for (let x = 3; x <= 10; x++) put(ox + x, oy - 1, f.yellow)
    for (const x of [3, 6, 7, 10]) put(ox + x, oy - 2, f.yellow)
    put(ox + 6, oy - 1, f.red)
  }
  if (form === 'cloud') {
    const glow = tick % 16 < 8 ? f.yellow : f.peach
    for (let x = 4; x <= 9; x++) put(ox + x, oy - 2, glow)
    put(ox + 3, oy - 1, glow)
    put(ox + 10, oy - 1, glow)
  }
}

// Each placed item in its slot; the bowl sits at bx.
const drawDecor = (home: Home, W: number, bx: number, tick: number, isNight: boolean, isFed: boolean, f: Flavor, put: Put) => {
  const decor = home.decor
  const slots = tierOf(home).slots
  const has = (id: string) => slots.some(slot => decor[slot] === id)
  const rect = (x0: number, y0: number, w: number, h: number, c: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, c)
  }
  // Rug under the active cat.
  if (has('rug')) for (let x = 6; x <= 22; x++) put(x, FLOOR_Y, x % 3 ? f.pink : f.flamingo)
  if (has('quilt')) for (let x = 5; x <= 23; x++) for (const y of [FLOOR_Y, FLOOR_Y + 1]) put(x, y, [f.teal, f.pink, f.yellow][(x + y) % 3] ?? f.teal)
  // Bed on the left, where a spare cat naps.
  if (has('box')) { rect(0, 17, 8, 4, mix(f.peach, f.yellow, 0.4)); rect(1, 17, 6, 1, mix(f.peach, f.crust, 0.4)) }
  if (has('cozy')) { rect(0, 19, 8, 2, f.mauve); rect(1, 18, 6, 1, f.lavender) }
  if (has('heated')) { rect(0, 19, 8, 2, f.red); rect(1, 18, 6, 1, tick % 16 < 8 ? f.peach : f.yellow) }
  // Plant between the cat and the bowl.
  const px0 = 26
  if (px0 + 3 < bx) {
    if (has('cactus')) { rect(px0 + 1, 15, 1, 5, f.green); put(px0, 16, f.green); put(px0 + 2, 17, f.green); rect(px0, 20, 3, 1, f.maroon) }
    if (has('catnip')) { rect(px0, 15, 3, 3, f.green); put(px0 + 1, 14, f.teal); rect(px0, 18, 3, 3, f.maroon) }
  }
  // Toys.
  const tx = Math.min(bx - 4, 30)
  if (has('yarn')) rect(tx, 19, 2, 2, f.maroon)
  if (has('wand')) { for (let i = 0; i < 5; i++) put(tx + Math.floor(i / 2), 20 - i, f.overlay2); rect(tx + 2, 14, 2, 2, f.pink) }
  if (has('laser')) put(Math.abs((tick % (2 * W)) - W), FLOOR_Y + 1, f.red)
  if (has('tree')) { rect(W - 2, 8, 2, 13, mix(f.peach, f.crust, 0.3)); rect(W - 5, 8, 5, 1, f.surface2); rect(W - 5, 14, 5, 1, f.surface2) }
  // Bowl or feeder.
  const bowl = has('sushi') ? f.red : f.blue
  for (let x = bx; x <= bx + 5; x++) put(x, 20, bowl)
  for (let x = bx + 1; x <= bx + 4; x++) put(x, 21, bowl)
  if (has('feeder') || has('sushi')) rect(bx + 1, 15, 4, 5, has('sushi') ? f.rosewater : f.sapphire)
  if (isFed) for (let x = bx + 1; x <= bx + 4; x++) put(x, 19, f.peach)
  // Something hanging from above.
  const hx = W - 16
  if (has('birds')) {
    rect(hx + 1, 0, 1, 4, f.overlay1); rect(hx, 4, 3, 2, f.maroon)
    put(hx - 1 + (tick % 12 < 6 ? 0 : -1), 5, f.blue); put(hx + 3 + (tick % 10 < 5 ? 0 : 1), 4, f.yellow)
  }
  if (has('lantern')) { rect(hx + 1, 0, 1, 3, f.overlay1); rect(hx, 3, 3, 3, isNight ? (tick % 12 < 6 ? f.yellow : f.peach) : f.red) }
  if (has('chime')) { rect(hx, 1, 4, 1, f.overlay1); for (const dx of [0, 1, 2, 3]) rect(hx + dx, 2, 1, 2 + ((dx + (tick >> 2)) % 3), f.sky) }
}

const drawMini = (cat: Pick<Cat, 'genes'> & { isAsleep?: boolean }, x0: number, y0: number, tick: number, f: Flavor, put: Put) => {
  const isBlink = cat.isAsleep === true || tick % 40 < 2
  MINI.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'o') return put(x0 + x, y0 + y, inkOf(f))
      const c = ch === 'E' && isBlink ? inkOf(f) : coatPixel(cat.genes, f, ch, x * 2, y * 2 + 3)
      if (c !== undefined) put(x0 + x, y0 + y, c)
    }),
  )
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
