import type { Cat, Home } from '../../types'
import type { TrailBackdrop, TrailProp } from '../content/types'
import { inkOf, mix } from '../theme'
import type { Flavor } from '../theme'
import type { Motion } from '../motion'
import { APPROACH, RESOLVE, beatAt, captionOf, trailOf } from '../trail'
import type { BeatView, Trail } from '../trail'
import { canvas, HEIGHT } from './canvas'
import type { RgbaImage, SceneCanvas } from './canvas'
import { drawCats } from './cats'
import { DESIGN, FLOOR, hash, pen, wrapF } from './fine/draw'
import type { Pen } from './fine/draw'

// The Expeditions tab picture: one run's party walking its trail, played from the run's seed.
type Run = Home['expeditions']['runs'][number]
const FOES: readonly TrailProp[] = ['rat', 'raccoon', 'crab', 'owl', 'pigeon', 'drone', 'crow', 'ghost', 'snowball', 'bee', 'butterfly', 'fish', 'meteor']
const SPEED = 26 // design units per second while walking

type Palette = { skyTop: number; skyLow: number; far: number; ground: number; speck: number }
const paletteOf = (b: TrailBackdrop, f: Flavor): Palette => ({
  garden: { skyTop: mix(f.sky, f.base, 0.55), skyLow: mix(f.sky, f.base, 0.8), far: mix(f.green, f.crust, 0.45), ground: mix(f.green, f.base, 0.45), speck: f.green },
  river: { skyTop: mix(f.sapphire, f.base, 0.55), skyLow: mix(f.sky, f.base, 0.75), far: mix(f.blue, f.base, 0.35), ground: mix(f.peach, f.base, 0.55), speck: f.rosewater },
  woods: { skyTop: mix(f.teal, f.crust, 0.6), skyLow: mix(f.teal, f.base, 0.7), far: mix(f.teal, f.crust, 0.55), ground: mix(f.green, f.crust, 0.55), speck: f.peach },
  snow: { skyTop: mix(f.lavender, f.base, 0.55), skyLow: mix(f.text, f.base, 0.75), far: mix(f.text, f.base, 0.45), ground: mix(f.text, f.base, 0.25), speck: f.sky },
  neon: { skyTop: f.crust, skyLow: mix(f.mauve, f.crust, 0.8), far: f.mantle, ground: f.surface0, speck: f.mauve },
  moon: { skyTop: f.crust, skyLow: f.mantle, far: f.surface1, ground: f.surface2, speck: f.overlay0 },
  patch: { skyTop: mix(f.peach, f.base, 0.6), skyLow: mix(f.yellow, f.base, 0.75), far: mix(f.maroon, f.crust, 0.55), ground: mix(f.peach, f.crust, 0.55), speck: f.peach },
})[b]

const drawBackdrop = (p: Pen, b: TrailBackdrop, scroll: number, tick: number, f: Flavor) => {
  const pal = paletteOf(b, f)
  p.fill(0, FLOOR, (dx, dy, x, y) => mix(pal.skyTop, pal.skyLow, y / FLOOR))
  if (b === 'moon' || b === 'neon') for (let i = 0; i < 14; i++) {
    const x = wrapF(hash(i, 3) * p.W - scroll * 0.05, p.W)
    if ((tick + i * 5) % 30 > 2) p.dot(x, 10 + hash(i, 7) * 34, b === 'moon' ? f.text : f.overlay1)
  }
  const far = scroll * 0.35
  for (let i = -1; i < p.W / 40 + 2; i++) {
    const x = i * 40 - wrapF(far, 40), h = 8 + hash(i + Math.floor(far / 40), 1) * 16
    if (b === 'woods' || b === 'snow') for (let k = 0; k < 3; k++) p.rect(x + 14 - k * 5, FLOOR - h - 6 + k * 7, 12 + k * 10, 7, pal.far)
    else if (b === 'neon') {
      p.rect(x + 2, FLOOR - h * 2 - 8, 30, h * 2 + 8, pal.far)
      for (let wy = 0; wy < 4; wy++) for (let wx = 0; wx < 3; wx++)
        if (hash(i * 7 + wx, wy) > 0.45) p.rect(x + 6 + wx * 8, FLOOR - h * 2 - 4 + wy * 7, 4, 3, wy % 2 ? f.mauve : f.yellow)
    } else if (b === 'moon') p.disc(x + 20, FLOOR + 2, 16, 6 + h / 4, pal.far)
    else if (b === 'river') p.rect(x, FLOOR - 10, 40, 10, (dx, dy) => (dx + dy + tick) % 9 ? pal.far : f.sky)
    else p.disc(x + 20, FLOOR, 22, h, pal.far)
  }
  p.rect(0, FLOOR, p.W, HEIGHT * DESIGN - FLOOR, pal.ground)
  for (let i = 0; i < p.W / 6 + 2; i++) {
    const x = i * 6 - wrapF(scroll, 6), seed = i + Math.floor(scroll / 6)
    if (hash(seed, 5) > 0.55) p.rect(x, FLOOR + 2 + hash(seed, 9) * 8, 2, 1, pal.speck)
  }
}

// Props are drawn at k times their spec around their ground anchor, so they read beside the cats.
const grow = (p: Pen, k: number, ax: number, ay: number): Pen => {
  const X = (x: number) => ax + (x - ax) * k, Y = (y: number) => ay + (y - ay) * k
  return { ...p, rect: (x, y, w, h, ink) => p.rect(X(x), Y(y), w * k, h * k, ink), dot: (x, y, ink) => p.rect(X(x), Y(y), k, k, ink),
    disc: (cx, cy, rx, ry, ink) => p.disc(X(cx), Y(cy), rx * k, ry * k, ink),
    line: (x0, y0, x1, y1, ink) => { for (let i = 0; i <= 1; i += 0.5 / k) p.line(X(x0) + i, Y(y0), X(x1) + i, Y(y1), ink) } }
}
const bob = (tick: number, n = 2) => Math.round(Math.sin(tick / 3) * n)
/** Draws one trail prop with its left edge at x on the ground; `isDone` shows the outcome. */
export const drawProp = (pen0: Pen, prop: TrailProp, x: number, tick: number, f: Flavor, isDone: boolean) => {
  const isFlat = prop === 'stream' || prop === 'gap' || prop === 'ice' || prop === 'fish'
  const p = isFlat ? pen0 : grow(pen0, prop === 'raccoon' || prop === 'drone' || prop === 'ghost' ? 1.15 : 1.5, x, FLOOR)
  const G = FLOOR, ink = inkOf(f), wood = mix(f.peach, f.crust, 0.5)
  switch (prop) {
    case 'bush': p.disc(x + 14, G - 8, 14, 9, mix(f.green, f.crust, 0.2)); for (const [dx, dy] of [[6, -10], [16, -13], [20, -6]]) p.disc(x + dx!, G + dy!, 1.5, 1.5, f.red); break
    case 'chest':
      p.rect(x, G - 14, 24, 14, wood); p.rect(x, G - 10, 24, 2, f.yellow)
      if (isDone) { p.rect(x, G - 24, 24, 4, wood); p.rect(x + 2, G - 16, 20, 3, f.yellow) } else { p.rect(x, G - 18, 24, 4, mix(wood, f.crust, 0.2)); p.rect(x + 10, G - 12, 4, 4, f.yellow) }
      break
    case 'rat': p.disc(x + 11, G - 5, 9, 5, f.overlay1); p.disc(x + 3, G - 6, 4, 4, f.overlay1); p.disc(x + 4, G - 11, 2, 2, f.pink); p.dot(x + 1, G - 7, ink); p.line(x + 20, G - 4, x + 28, G - 8 + bob(tick, 1), f.pink); break
    case 'campfire': {
      const fl = tick % 6 < 3 ? 0 : 1
      p.line(x, G - 1, x + 20, G - 4, wood); p.line(x, G - 4, x + 20, G - 1, wood)
      p.disc(x + 10, G - 9 - fl, 6, 8 + fl, f.peach); p.disc(x + 10, G - 7, 3, 5, f.yellow); break
    }
    case 'log': p.rect(x, G - 10, 34, 10, wood); p.disc(x + 34, G - 5, 4, 5, mix(f.peach, f.base, 0.4)); p.dot(x + 34, G - 5, wood); break
    case 'signpost': p.rect(x + 9, G - 26, 3, 26, wood); p.rect(x, G - 30, 22, 9, mix(f.peach, f.base, 0.3)); p.rect(x + 3, G - 27, 14, 1, wood); p.rect(x + 3, G - 24, 10, 1, wood); break
    case 'stray': p.disc(x + 12, G - 7, 10, 7, f.overlay2); p.disc(x + 4, G - 15, 6, 6, f.overlay2); p.rect(x, G - 23, 3, 4, f.overlay2); p.rect(x + 6, G - 23, 3, 4, f.overlay2)
      p.dot(x + 2, G - 16, ink); p.dot(x + 6, G - 16, ink); p.line(x + 22, G - 8, x + 28, G - 16 + bob(tick, 3), f.overlay2); break
    case 'sack': p.disc(x + 10, G - 9, 10, 9, mix(f.peach, f.base, 0.35)); p.rect(x + 8, G - 20, 4, 3, f.yellow); break
    case 'raccoon':
      p.disc(x + 24, G - 14, 20, 14, f.overlay0); p.disc(x + 8, G - 24, 11, 10, f.overlay1); p.rect(x - 2, G - 27, 20, 5, f.crust)
      p.dot(x + 3, G - 25, f.text); p.dot(x + 11, G - 25, f.text); p.rect(x, G - 35, 4, 5, f.overlay1); p.rect(x + 13, G - 35, 4, 5, f.overlay1)
      for (let k = 0; k < 4; k++) p.rect(x + 42 + k * 4, G - 18 - k * 3 + bob(tick, 1), 5, 5, k % 2 ? f.crust : f.overlay1)
      break
    case 'butterfly': { const y = G - 26 + bob(tick, 4), w = tick % 4 < 2 ? 4 : 2; p.disc(x + 4, y, w, 3, f.pink); p.disc(x + 11, y, w, 3, f.pink); p.rect(x + 7, y - 2, 1, 5, ink); break }
    case 'bee': { const y = G - 20 + bob(tick, 3); p.disc(x + 6, y, 6, 4, f.yellow); p.rect(x + 4, y - 4, 1, 8, ink); p.rect(x + 8, y - 4, 1, 8, ink); p.disc(x + 6, y - 6, 4, 2, tick % 2 ? f.text : f.sky); break }
    case 'crab': p.disc(x + 12, G - 6, 11, 6, f.red); p.disc(x, G - 11 + bob(tick, 1), 4, 3, f.red); p.disc(x + 24, G - 11 - bob(tick, 1), 4, 3, f.red); p.rect(x + 8, G - 15, 1, 4, f.red); p.rect(x + 15, G - 15, 1, 4, f.red); p.dot(x + 8, G - 16, ink); p.dot(x + 15, G - 16, ink); break
    case 'stream': p.rect(x - 4, G + 1, 40, 8, (dx, dy) => (dx + dy * 3 + tick) % 11 ? f.blue : f.sky); break
    case 'fish': { const y = G - 6 - Math.round(20 * Math.sin(((tick % 16) / 16) * Math.PI)); p.rect(x - 4, G + 1, 30, 7, f.blue); p.disc(x + 10, y, 6, 3, f.teal); p.rect(x + 16, y - 3, 3, 6, f.teal); p.dot(x + 6, y - 1, ink); break }
    case 'owl': p.rect(x + 4, G - 12, 16, 12, wood); p.disc(x + 12, G - 22, 8, 10, mix(f.peach, f.crust, 0.35)); p.disc(x + 8, G - 25, 3, 3, f.yellow); p.disc(x + 16, G - 25, 3, 3, f.yellow)
      if (tick % 30 > 1) { p.dot(x + 8, G - 25, ink); p.dot(x + 16, G - 25, ink) } p.rect(x + 11, G - 21, 2, 2, f.peach); break
    case 'mushroom': for (const [dx, s] of [[0, 1], [14, 0.7]] as const) { p.rect(x + dx + 6 * s, G - 8 * s, 4 * s, 8 * s, f.text); p.disc(x + dx + 8 * s, G - 9 * s, 8 * s, 5 * s, f.red); p.dot(x + dx + 6 * s, G - 11 * s, f.text) } break
    case 'snowball': { const dx = isDone ? 0 : -((tick * 3) % 30); p.disc(x + 8 + dx, G - 14, 6, 6, f.text); p.disc(x + 20, G - 5, 9, 5, mix(f.text, f.base, 0.2)); break }
    case 'ice': p.rect(x - 6, G, 46, 4, mix(f.sky, f.text, 0.5)); p.rect(x + ((tick * 2) % 40) - 6, G + 1, 6, 1, f.text); break
    case 'pigeon': p.disc(x + 10, G - 7, 8, 6, f.overlay2); p.disc(x + 3, G - 13 + (tick % 8 < 4 ? 0 : 1), 4, 4, f.overlay1); p.rect(x + 3, G - 10, 4, 2, f.teal); p.dot(x - 1, G - 13, f.peach); p.dot(x + 2, G - 14, ink); break
    case 'drone': { const y = G - 38 + bob(tick, 3); p.rect(x, y, 30, 8, f.surface2); p.rect(x + 12, y + 8, 6, 3, f.overlay0); p.dot(x + 15, y + 3, tick % 6 < 3 ? f.red : f.yellow)
      for (const rx of [x - 4, x + 26]) p.rect(rx, y - 3, 8, 1, tick % 2 ? f.text : f.overlay1); break }
    case 'gap': p.rect(x, G, 26, HEIGHT * DESIGN - G, f.crust); p.rect(x - 2, G, 2, 2, f.overlay1); p.rect(x + 26, G, 2, 2, f.overlay1); break
    case 'meteor': { const k = isDone ? 1 : (tick % 20) / 20, mx = x + 30 - 22 * k, my = G - 44 + 36 * k
      p.line(mx, my, mx + 12, my - 10, f.yellow); p.disc(mx, my, 5, 5, f.peach); if (isDone) p.disc(x + 8, G, 10, 3, f.surface1); break }
    case 'alien': p.disc(x + 8, G - 8, 7, 8, f.green); p.disc(x + 8, G - 19, 7, 6, f.green); p.disc(x + 5, G - 20, 2, 2, ink); p.disc(x + 11, G - 20, 2, 2, ink)
      p.line(x + 8, G - 25, x + 8 + bob(tick, 2), G - 31, f.green); p.dot(x + 8 + bob(tick, 2), G - 32, f.yellow); break
    case 'crow': { const y = G - 10 + (tick % 8 < 4 ? 0 : -2); p.disc(x + 10, y, 9, 6, inkOf(f) === f.crust ? f.surface0 : f.crust); p.disc(x + 2, y - 5, 4, 4, f.surface0); p.rect(x - 4, y - 5, 3, 2, f.yellow); p.dot(x + 1, y - 6, f.text)
      p.line(x + 8, y - 4, x + 16, y - (tick % 4 < 2 ? 12 : 2), f.surface0); break }
    case 'ghost': { const y = G - 26 + bob(tick, 3), body = mix(f.text, f.base, 0.25); p.disc(x + 14, y, 14, 14, body)
      p.rect(x, y, 28, 10, body); for (let k = 0; k < 4; k++) p.disc(x + 3.5 + k * 7, y + 10 + ((k + (tick >> 2)) % 2) * 2, 3.5, 3, body)
      p.disc(x + 9, y - 3, 2, 3, ink); p.disc(x + 19, y - 3, 2, 3, ink); p.disc(x + 14, y + 4, 3, 2, ink); break }
    case 'pumpkin': p.disc(x + 13, G - 9, 13, 9, f.peach); p.line(x + 8, G - 17, x + 8, G - 1, mix(f.peach, f.maroon, 0.5)); p.line(x + 18, G - 17, x + 18, G - 1, mix(f.peach, f.maroon, 0.5))
      p.rect(x + 12, G - 21, 3, 4, f.green); if (isDone) { p.rect(x + 7, G - 12, 3, 3, f.yellow); p.rect(x + 16, G - 12, 3, 3, f.yellow); p.rect(x + 9, G - 6, 9, 2, f.yellow) } break
  }
}

const poof = (p: Pen, x: number, k: number, f: Flavor) => {
  const r = 4 + 10 * k, c = mix(f.text, f.overlay1, k)
  for (const [dx, dy] of [[0, -8], [10, -12], [18, -6], [8, -2]] as const) p.disc(x + dx + (dx - 8) * k, 84 + dy - 6 * k, r * 0.6, r * 0.5, c)
}
const sparkles = (p: Pen, x: number, tick: number, f: Flavor) => {
  for (let i = 0; i < 6; i++) {
    const a = i + tick / 4, sx = x + 12 + Math.cos(a) * (10 + (tick % 8)), sy = 84 - 18 + Math.sin(a) * 9 - (tick % 8)
    p.rect(sx, sy, 2, 2, i % 2 ? f.yellow : f.text)
  }
}

const soloOf = (home: Home, cat: Cat): Home => ({ ...home, cats: [cat], visitors: [], activeId: cat.id, effect: null })
const motionAt = (x: number, move: string, frame: number): Motion => ({ x, y: 0, facing: 1, move, frame, left: 0, target: 0, stage: 'stay', isHidden: false })

/** Draws the run's current beat: backdrop, prop, party and caption. */
const drawRun = (c: SceneCanvas, home: Home, trail: Trail, run: Run, now: number, tick: number, f: Flavor, label: string) => {
  const p = pen(c)
  const view: BeatView = beatAt(trail, now)
  const { beat, t, stage } = view
  const loop = beat.event.seconds * 1000
  const elapsed = Math.max(0, now - beat.at), loops = Math.floor(elapsed / loop)
  const isWalk = beat.event.kind === 'walk' || beat.event.kind === 'return'
  const walked = isWalk ? elapsed : loops * loop * APPROACH + Math.min(t, APPROACH) * loop
  const scroll = (walked / 1000) * SPEED + (beat.at - trail.startAt) / 400
  drawBackdrop(p, trail.backdrop, scroll, tick, f)
  const party = run.cats.map(id => home.cats.find(cat => cat.id === id)).filter((cat): cat is Cat => !!cat)
  // The lead leaves room for the prop on its right; followers spread behind it, overlapping on narrow panes.
  const leadX = Math.max(4, p.W - 56 - 52)
  const step = party.length > 1 ? Math.min(52, Math.max(14, (leadX - 2) / (party.length - 1))) : 0
  const stop = leadX + 58
  const prop = beat.event.prop
  if (prop && beat.event.kind !== 'return') {
    const px = stage === 'approach' ? stop + (p.W + 8 - stop) * (1 - t / APPROACH) : stop
    const isDone = stage === 'resolve'
    const isFoe = FOES.includes(prop)
    if (!(isDone && isFoe)) drawProp(p, prop, Math.round(px), tick, f, isDone)
    if (isDone && isFoe) poof(p, px, (t - RESOLVE) / (1 - RESOLVE), f)
    if (isDone && (beat.event.kind === 'treasure' || beat.event.kind === 'forage' || beat.event.kind === 'discover')) sparkles(p, px, tick, f)
    if (beat.event.kind === 'boss' && stage !== 'resolve') {
      const hp = stage === 'approach' ? 1 : 1 - (t - APPROACH) / (RESOLVE - APPROACH)
      p.rect(px, 30, 40, 3, f.surface0); p.rect(px, 30, Math.max(1, 40 * hp), 3, f.red)
    }
  }
  party.forEach((cat, i) => {
    const k = party.length - 1 - i
    const x = leadX - k * step
    const move = isWalk || stage === 'approach' || i === 0 || beat.event.kind === 'rest' ? view.move : stage === 'resolve' ? beat.event.moves.at(-1)! : 'walk'
    drawCats(c, soloOf(home, cat), now, tick, f, motionAt(x, move, tick + i * 3), undefined, true)
  })
  if (prop && beat.event.kind === 'return') drawProp(p, prop, leadX + 40, tick, f, false)
  if (beat.event.kind === 'rest' && stage !== 'approach') c.text(Math.round(leadX / DESIGN) + 10 + (tick >> 3) % 2, 2 + (tick >> 4) % 2, 'z', f.lavender)
  if (beat.event.kind === 'meet' && stage === 'resolve') c.text(Math.round(stop / DESIGN) + 2, 3, '♥', f.pink)
  if (beat.event.kind === 'discover' && stage === 'action') c.text(Math.round(leadX / DESIGN) + 6, 2, '!', f.yellow)
  for (let x = 0; x < c.w; x++) c.put(x, 2, x < Math.round(c.w * view.progress) ? f.green : mix(f.crust, f.surface1, 0.5))
  const lead = party[party.length - 1]?.name ?? 'The party'
  c.text(1, 0, `${label} ${view.index + 1}/${trail.beats.length}`.slice(0, c.w - 2), f.text)
  c.text(1, 11, captionOf(beat, lead).slice(0, c.w - 2), stage === 'resolve' ? f.yellow : f.text)
}

// No party out: a quiet camp with the active cat loafing by the fire.
const drawCamp = (c: SceneCanvas, home: Home, now: number, tick: number, f: Flavor) => {
  const p = pen(c)
  drawBackdrop(p, 'garden', 0, tick, f)
  drawProp(p, 'signpost', Math.round(p.W * 0.7), tick, f, false)
  drawProp(p, 'campfire', Math.round(p.W * 0.5), tick, f, false)
  const cat = home.cats.find(cat => cat.id === home.activeId) ?? home.cats[0]
  if (cat) drawCats(c, soloOf(home, cat), now, tick, f, motionAt(Math.round(p.W * 0.5) - 66, 'loaf', tick), undefined, true)
  c.text(1, 0, 'NO PARTIES OUT', f.text)
  c.text(1, 11, 'Pick a trail below'.slice(0, c.w - 2), f.subtext0)
}

const drawTrailScene = (home: Home, now: number, tick: number, f: Flavor, cols: number, watch: number, scale = 1): SceneCanvas => {
  const c = canvas(cols, scale)
  const runs = home.expeditions.runs
  const run = runs[((watch % Math.max(1, runs.length)) + runs.length) % Math.max(1, runs.length)]
  if (!run) { drawCamp(c, home, now, tick, f); return c }
  const trail = trailOf(run)
  drawRun(c, home, trail, run, Math.min(now, run.endsAt), tick, f, (trail.exp?.label ?? run.exp).toUpperCase())
  return c
}

export const trailCells = (home: Home, now: number, tick: number, f: Flavor, cols: number, watch: number): string =>
  drawTrailScene(home, now, tick, f, cols, watch).pack()
export const trailImage = (home: Home, now: number, tick: number, f: Flavor, cols: number, watch: number, scale: number): RgbaImage =>
  drawTrailScene(home, now, tick, f, cols, watch, scale).image(inkOf(f))
/** One frame of a given trail, for tools/preview.mjs. */
export const runImage = (home: Home, run: Run, trail: Trail, now: number, tick: number, f: Flavor, cols: number, scale: number): RgbaImage => {
  const c = canvas(cols, scale)
  drawRun(c, home, trail, run, now, tick, f, (trail.exp?.label ?? run.exp).toUpperCase())
  return c.image(inkOf(f))
}
