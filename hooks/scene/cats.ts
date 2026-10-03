import type { Cat, Home } from '../../types'
import { CAT_ART, paneArtOf } from '../art/cats'
import { isBirthday } from '../calendar'
import { activeCat, moodOf, stageOf } from '../game'
import { coatPixel } from '../genes'
import { formOf } from '../skills'
import type { Form } from '../skills'
import { inkOf, mix } from '../theme'
import type { Flavor } from '../theme'
import { FLOOR_Y } from './canvas'
import type { SceneCanvas } from './canvas'
import { drawHiCat } from './hicat'

export type CatScene = { cat: Cat; mood: ReturnType<typeof moodOf>; ox: number; oy: number; headRow: number; birthday: boolean }
const TAIL: [number, number][][] = [
  [[14, 8], [14, 9], [14, 10], [13, 11]],
  [[15, 9], [15, 10], [14, 11], [13, 11]],
]

const formBack = (form: Form | null, ox: number, oy: number, tick: number, f: Flavor, c: SceneCanvas) => {
  if (form === 'royal') for (let y = 8; y <= 12; y++) for (const x of [0, 1, 12, 13]) c.put(ox + x, oy + y, f.mauve)
  if (form === 'cloud') {
    const lift = tick % 8 < 4 ? 0 : 1
    for (const [x, y] of [[-2, 7], [-1, 7], [-3, 8], [-2, 8], [-1, 8], [-2, 9]] as const) {
      c.put(ox + x, oy + y - lift, f.lavender)
      c.put(ox + 13 - x, oy + y - lift, f.lavender)
    }
  }
  if (form === 'chonk') for (let y = 8; y <= 11; y++) for (const x of [0, 13]) c.put(ox + x, oy + y, inkOf(f))
}

const formFront = (form: Form | null, ox: number, oy: number, tick: number, f: Flavor, c: SceneCanvas) => {
  if (form === 'ninja') {
    for (let x = 2; x <= 11; x++) c.put(ox + x, oy + 3, f.red)
    const flap = tick % 6 < 3 ? 0 : 1
    c.put(ox + 13, oy + 3 + flap, f.red)
    c.put(ox + 14, oy + 4 - flap, f.red)
  }
  if (form === 'royal') {
    for (let x = 3; x <= 10; x++) c.put(ox + x, oy - 1, f.yellow)
    for (const x of [3, 6, 7, 10]) c.put(ox + x, oy - 2, f.yellow)
    c.put(ox + 6, oy - 1, f.red)
  }
  if (form === 'cloud') {
    const glow = tick % 16 < 8 ? f.yellow : f.peach
    for (let x = 4; x <= 9; x++) c.put(ox + x, oy - 2, glow)
    c.put(ox + 3, oy - 1, glow)
    c.put(ox + 10, oy - 1, glow)
  }
}

const mini = (cat: Pick<Cat, 'genes'> & { isAsleep?: boolean }, x0: number, y0: number, tick: number,
  f: Flavor, c: SceneCanvas) => {
  const isBlink = cat.isAsleep === true || tick % 40 < 2
  CAT_ART.mini.frames[0]?.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === 'o') return c.put(x0 + x, y0 + y, inkOf(f))
    const color = ch === 'E' && isBlink ? inkOf(f) : coatPixel(cat.genes, f, ch, x * 2, y * 2 + 3)
    if (color !== undefined) c.put(x0 + x, y0 + y, color)
  }))
}

export const drawCats = (c: SceneCanvas, home: Home, now: number, tick: number, f: Flavor): CatScene => {
  const cat = activeCat(home)
  const others = home.cats.filter(other => other.id !== cat.id)
  if (others[0]) mini(others[0], 1, FLOOR_Y - 5, tick, f, c)
  const fence = [26, 33, 40, 47].filter(x => x + 6 < c.w - 6)
  ;[...others.slice(1), ...home.visitors].slice(0, fence.length)
    .forEach((other, i) => mini(other, fence[i] ?? 26, 9, tick + i * 7, f, c))

  const mood = moodOf(cat)
  const stage = stageOf(cat.level)
  const bob = mood === 'sleeping' ? 1 : tick % 16 < 8 ? 0 : 1
  const age = home.effect ? (now - home.effect.at) / 1000 : 99
  const jump = home.effect && ['yarn', 'levelup', 'adopt', 'evolve', 'welcome'].includes(home.effect.kind) && age < 2
    ? -Math.round(3 * Math.sin((age / 1.2) * Math.PI)) : 0
  const ox = 8
  const oy = 8 + bob + Math.min(0, jump)
  const isBlink = mood === 'sleeping' || tick % 40 < 2
  const form = formOf(cat)
  const birthday = isBirthday(cat, now)
  if (c.isFine) {
    // The picture canvas draws the 4x cat; its bob is one fine pixel instead of a whole scene pixel.
    for (let x = 32; x < 92; x++) for (let y = 0; y < 3; y++)
      if (((x - 62) / 30) ** 2 + ((y - 1) / 2) ** 2 <= 1) c.fine(x, FLOOR_Y * 4 + y, mix(f.crust, f.surface2, 0.45))
    const fineY = (8 + Math.min(0, jump)) * 4 + (mood === 'sleeping' ? 2 : bob)
    drawHiCat(c, ox * 4, fineY, { genes: cat.genes, mood, form, isAdult: stage !== 'kitten', isBirthday: birthday,
      isBlink, tick }, f)
    return { cat, mood, ox, oy, headRow: Math.floor(oy / 2), birthday }
  }
  // Small floor shadow makes the silhouette legible against rugs and quilts.
  for (let x = 7; x < 24; x++) if (x % 3 !== 0) c.put(x, FLOOR_Y, mix(f.crust, f.surface2, 0.45))
  formBack(form, ox, oy, tick, f, c)
  paneArtOf(cat.genes).frames[0]?.forEach((row, y) => [...row].forEach((ch, x) => {
    let token = ch
    if (token === 'E' && isBlink) token = 'o'
    if (token === 'p' && mood !== 'happy') token = 'f'
    if (y === 7 && token === 'f' && stage !== 'kitten') return c.put(ox + x, oy + y, f.red)
    if (token === 'o') return c.put(ox + x, oy + y, inkOf(f))
    if (token === 'p') return c.put(ox + x, oy + y, f.pink)
    if (token === 'n') return c.put(ox + x, oy + y, f.red)
    const color = coatPixel(cat.genes, f, token, x, y)
    if (color !== undefined) c.put(ox + x, oy + y, color)
  }))
  if (mood === 'grumpy') for (const x of [3, 4, 8, 9]) c.put(ox + x, oy + 4, inkOf(f))
  const tailColor = coatPixel(cat.genes, f, 'f', 12, 10) ?? f.peach
  for (const [x, y] of TAIL[mood === 'sleeping' ? 0 : Math.floor(tick / 4) % 2] ?? []) c.put(ox + x, oy + y, tailColor)
  formFront(form, ox, oy, tick, f, c)
  if (birthday) for (const [dx, dy] of [[6, -1], [7, -1], [8, -1], [7, -2], [7, -3]] as const)
    c.put(ox + dx, oy + dy, dy === -3 ? f.yellow : f.mauve)
  return { cat, mood, ox, oy, headRow: Math.floor(oy / 2), birthday }
}
