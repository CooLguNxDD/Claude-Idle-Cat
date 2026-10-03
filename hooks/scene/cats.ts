import { catsAtHome } from '../away'
import type { Cat, Home } from '../../types'
import { CAT_ART, paneArtOf, posePixel } from '../art/cats'
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
import { DESIGN, pen } from './fine/draw'
import { poseOf } from '../motion'
import { worldOf } from '../world'
import type { Motion } from '../motion'

// The active cat's left edge, in design units, when nothing is moving it.
export const CLASSIC_X = 8 * DESIGN

export type CatScene = { cat: Cat; mood: ReturnType<typeof moodOf>; ox: number; oy: number; headRow: number; birthday: boolean }
const TAIL: [number, number][][] = [
  [[14, 8], [14, 9], [14, 10], [13, 11]],
  [[15, 9], [15, 10], [14, 11], [13, 11]],
]

// Puts one sprite pixel at (x, y) relative to the cat, mirrored when it faces right.
type At = (x: number, y: number, color: number) => void

const formBack = (form: Form | null, tick: number, f: Flavor, at: At) => {
  if (form === 'royal') for (let y = 8; y <= 12; y++) for (const x of [0, 1, 12, 13]) at(x, y, f.mauve)
  if (form === 'cloud') {
    const lift = tick % 8 < 4 ? 0 : 1
    for (const [x, y] of [[-2, 7], [-1, 7], [-3, 8], [-2, 8], [-1, 8], [-2, 9]] as const) {
      at(x, y - lift, f.lavender)
      at(13 - x, y - lift, f.lavender)
    }
  }
  if (form === 'chonk') for (let y = 8; y <= 11; y++) for (const x of [0, 13]) at(x, y, inkOf(f))
}

const formFront = (form: Form | null, tick: number, f: Flavor, at: At) => {
  if (form === 'ninja') {
    for (let x = 2; x <= 11; x++) at(x, 3, f.red)
    const flap = tick % 6 < 3 ? 0 : 1
    at(13, 3 + flap, f.red)
    at(14, 4 - flap, f.red)
  }
  if (form === 'royal') {
    for (let x = 3; x <= 10; x++) at(x, -1, f.yellow)
    for (const x of [3, 6, 7, 10]) at(x, -2, f.yellow)
    at(6, -1, f.red)
  }
  if (form === 'cloud') {
    const glow = tick % 16 < 8 ? f.yellow : f.peach
    for (let x = 4; x <= 9; x++) at(x, -2, glow)
    at(3, -1, glow)
    at(10, -1, glow)
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

/** Draws the household; `motion` places and poses the active cat, else it sits at its classic spot. */
export const drawCats = (c: SceneCanvas, home: Home, now: number, tick: number, f: Flavor, motion?: Motion, partner?: { id: string; motion: Motion }, isSolo = false): CatScene => {
  const cat = activeCat(home)
  const others = isSolo ? [] : catsAtHome(home).filter(other => other.id !== cat.id && other.id !== partner?.id)
  const world = worldOf(home)
  if (others[0]) mini(others[0], world.slots.bed + 1, FLOOR_Y - 5, tick, f, c)
  const fence = world.perches.filter(x => x + 6 < c.w - 6)
  ;[...others.slice(1), ...(isSolo ? [] : home.visitors)].slice(0, fence.length)
    .forEach((other, i) => mini(other, fence[i] ?? 26, 9, tick + i * 7, f, c))

  if (!isSolo && !catsAtHome(home).length) {
    c.text(8, 6, 'AWAY ON A TRIP', f.yellow)
    return { cat, mood: 'ok', ox: 8, oy: 8, headRow: 4, birthday: false }
  }
  if (partner && !isSolo) {
    const buddy = home.cats.find(c => c.id === partner.id)
    if (buddy) drawCats(c, { ...home, cats: [buddy], visitors: [], activeId: buddy.id }, now, tick, f, partner.motion, undefined, true)
  }
  const mood = moodOf(cat)
  const stage = stageOf(cat.level)
  const pose = motion ? poseOf(motion) : null
  const isMoving = pose?.kind === 'walk' || pose?.kind === 'run'
  const bob = mood === 'sleeping' || pose?.kind === 'sleep' ? 1 : isMoving ? (pose.phase < 0.5 ? 0 : 1)
    : tick % 16 < 8 ? 0 : 1
  const age = home.effect ? (now - home.effect.at) / 1000 : 99
  const jump = home.effect && ['yarn', 'levelup', 'adopt', 'evolve', 'welcome'].includes(home.effect.kind) && age < 2
    ? -Math.round(3 * Math.sin((age / 1.2) * Math.PI)) : 0
  const x = motion?.x ?? CLASSIC_X
  const lift = pose?.lift ?? 0
  const ox = Math.round(x / DESIGN)
  const oy = 8 + bob + Math.min(0, jump) + Math.round(lift / DESIGN) + (pose?.kind === 'crouch' || pose?.kind === 'loaf' ? 1 : 0)
  const isMirrored = pose?.facing === 1
  const at: At = (dx, dy, color) => {
    const [px, py] = posePixel(dx, dy, pose?.kind ?? 'sit', pose?.phase ?? 0)
    c.put(ox + (isMirrored ? 15 - px : px), oy + py, color)
  }
  const isBlink = mood === 'sleeping' || pose?.kind === 'sleep' || pose?.kind === 'groom' || tick % 40 < 2
  const form = formOf(cat)
  const birthday = isBirthday(cat, now)
  if (motion?.isHidden) return { cat, mood, ox, oy, headRow: Math.floor(oy / 2), birthday }
  if (c.isFine) {
    // The picture canvas draws the cat from its spec; its bob is one design unit instead of a whole scene pixel.
    const p = pen(c)
    p.disc(x + 30, FLOOR_Y * DESIGN + 1.5, 30, 1.5, mix(f.crust, f.surface2, 0.45))
    const fineY = (8 + Math.min(0, jump)) * DESIGN + (mood === 'sleeping' ? 2 : bob) + lift
    drawHiCat(p, x, fineY, { genes: cat.genes, mood, form, isAdult: stage !== 'kitten', isBirthday: birthday,
      isBlink, tick, ...(pose ? { pose: { kind: pose.kind, phase: pose.phase, facing: pose.facing } } : {}) }, f)
    return { cat, mood, ox, oy, headRow: Math.floor(oy / 2), birthday }
  }
  // Small floor shadow makes the silhouette legible against rugs and quilts.
  for (let sx = ox - 1; sx < ox + 16; sx++) if (sx % 3 !== 0) c.put(sx, FLOOR_Y, mix(f.crust, f.surface2, 0.45))
  formBack(form, tick, f, at)
  paneArtOf(cat.genes).frames[0]?.forEach((row, y) => [...row].forEach((ch, x) => {
    let token = ch
    if (token === 'E' && isBlink) token = 'o'
    if (token === 'p' && mood !== 'happy') token = 'f'
    if (y === 7 && token === 'f' && stage !== 'kitten') return at(x, y, f.red)
    if (token === 'o') return at(x, y, inkOf(f))
    if (token === 'p') return at(x, y, f.pink)
    if (token === 'n') return at(x, y, f.red)
    const color = coatPixel(cat.genes, f, token, x, y)
    if (color !== undefined) at(x, y, color)
  }))
  if (mood === 'grumpy') for (const gx of [3, 4, 8, 9]) at(gx, 4, inkOf(f))
  const tailColor = coatPixel(cat.genes, f, 'f', 12, 10) ?? f.peach
  const isTailStill = mood === 'sleeping' || pose?.kind === 'sleep' || pose?.kind === 'loaf'
  for (const [tx, ty] of TAIL[isTailStill ? 0 : Math.floor(tick / (isMoving ? 2 : 4)) % 2] ?? []) at(tx, ty, tailColor)
  formFront(form, tick, f, at)
  if (birthday) for (const [dx, dy] of [[6, -1], [7, -1], [8, -1], [7, -2], [7, -3]] as const)
    at(dx, dy, dy === -3 ? f.yellow : f.mauve)
  return { cat, mood, ox, oy, headRow: Math.floor(oy / 2), birthday }
}
