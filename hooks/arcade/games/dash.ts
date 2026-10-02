// Rooftop Dash: the cat runs the rooftops, jumping flowerpots and ducking pigeons (Chrome dino style).
import { seeded } from '../../rng'
import type { Rng } from '../../rng'
import { mix } from '../../theme'
import { burst, clear, drawParticles, number, rect, shake, sprite, stepParticles, stepShake, vgradient } from '../engine'
import type { Particle, Shake } from '../engine'
import { isKey } from '../game'
import type { Game } from '../game'
import { CAT_DUCK, CAT_RUN, catPaint, paletteOf } from '../sprites'

type Kind = 'pot' | 'tall' | 'bird' | 'fish'
type Thing = { kind: Kind; x: number; y: number; w: number; h: number; isTaken?: boolean }
export type DashState = {
  w: number; h: number; ground: number; rng: Rng; t: number
  y: number; vy: number; duck: number; buffer: number
  speed: number; ramp: number; dist: number; treats: number
  things: Thing[]; gap: number; isOver: boolean
  particles: Particle[]; shake: Shake; pops: { x: number; y: number; life: number }[]
}

export const GRAVITY = 260
export const JUMP_V = 98
const CAT_X = 5
const START_SPEED = 32
const MAX_SPEED = 84
const DUCK_S = 0.45
const BUFFER_S = 0.12
const BIRDS_AFTER_S = 15
const POINTS_PER_PX = 0.25
const TREAT = 25

const SIZE: Record<Kind, [number, number]> = { pot: [4, 4], tall: [4, 7], bird: [5, 3], fish: [4, 3] }
const POT = ['.gg.', 'gGGg', 'pppp', '.pp.']
const TALL = ['.g..', 'gGg.', '.gGg', '.gg.', 'pppp', 'pppp', '.pp.']
const BIRD = [['o...o', '.www.', '..o..'], ['.....', 'owwwo', '..o..']]
const FISH = ['.bb.', 'bbbb', '.bb.']

const onGround = (s: DashState) => s.y >= s.ground && s.vy >= 0
const catBox = (s: DashState) =>
  s.duck > 0 && onGround(s) ? { x: CAT_X + 1, y: s.ground - 4, w: 10, h: 4 } : { x: CAT_X + 2, y: s.y - 7 + 1, w: 8, h: 6 }
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: Thing) =>
  a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h && a.y + a.h > b.y

const spawn = (s: DashState): Thing => {
  const roll = s.rng()
  const kind: Kind = s.t > BIRDS_AFTER_S && roll < 0.3 ? 'bird' : roll < 0.6 ? 'pot' : roll < 0.85 ? 'tall' : 'fish'
  const [w, h] = SIZE[kind]
  const y = kind === 'bird' ? s.ground - 7 - Math.floor(s.rng() * 2) : kind === 'fish' ? s.ground - 17 : s.ground - h
  return { kind, x: s.w + 2, y, w, h }
}

export const dash: Game<DashState> = {
  id: 'dash',
  name: 'Rooftop Dash',
  blurb: 'Jump the flowerpots, duck the pigeons, grab fish treats.',
  controls: 'space/↑ jump · ↓ duck',
  seconds: 60,
  medals: [250, 550, 850],
  init: (seed, mods, w, h) => ({
    w, h, ground: h - 5, rng: seeded(seed), t: 0, y: h - 5, vy: 0, duck: 0, buffer: 0,
    speed: START_SPEED, ramp: 1.4 / (1 + 0.15 * mods.dreamer), dist: 0, treats: 0,
    things: [], gap: w * 0.6, isOver: false, particles: [], shake: { t: 0, mag: 0 }, pops: [],
  }),
  step: (s, dt, input) => {
    s.particles = stepParticles(s.particles, dt)
    s.shake = stepShake(s.shake, dt)
    s.pops = s.pops.filter(p => (p.life -= dt) > 0)
    if (s.isOver) return s
    s.t += dt
    if (isKey(input, ' ', 'space', 'up', 'w', 'k') || input.some(i => i.kind === 'down')) s.buffer = BUFFER_S
    if (isKey(input, 'down', 's', 'j')) {
      s.duck = DUCK_S
      if (!onGround(s)) s.vy += 120
    }
    s.buffer = Math.max(0, s.buffer - dt)
    s.duck = Math.max(0, s.duck - dt)
    if (s.buffer > 0 && onGround(s) && s.duck === 0) {
      s.vy = -JUMP_V
      s.buffer = 0
    }
    const wasAir = !onGround(s)
    s.vy += GRAVITY * dt
    s.y = Math.min(s.ground, s.y + s.vy * dt)
    if (s.y >= s.ground) {
      if (wasAir && s.vy > 0) s.particles.push(...burst(s.rng, CAT_X + 5, s.ground, 0xffffff, 4, 18))
      s.vy = 0
    }
    s.speed = Math.min(MAX_SPEED, s.speed + s.ramp * dt)
    const move = s.speed * dt
    s.dist += move
    for (const th of s.things) th.x -= move
    s.things = s.things.filter(th => th.x + th.w > -2 && !th.isTaken)
    s.gap -= move
    if (s.gap <= 0) {
      s.things.push(spawn(s))
      // The gap grows with speed so a jump always fits.
      s.gap = s.speed * (0.75 + s.rng() * 0.9) + 8
    }
    const box = catBox(s)
    for (const th of s.things) {
      if (!overlaps(box, th)) continue
      if (th.kind === 'fish') {
        th.isTaken = true
        s.treats++
        s.pops.push({ x: th.x, y: th.y - 6, life: 0.6 })
        s.particles.push(...burst(s.rng, th.x + 2, th.y + 1, 0xf9e2af, 8, 30))
        continue
      }
      s.isOver = true
      s.shake = shake(1.5)
      s.particles.push(...burst(s.rng, box.x + 5, box.y + 3, 0xf38ba8, 14, 45))
    }
    if (s.t >= dash.seconds) s.isOver = true
    return s
  },
  draw: (s, f, { f: fl, genes, tick }) => {
    const sky = fl.isLight ? [fl.sky, fl.base] : [fl.crust, fl.surface0]
    clear(f, fl.base)
    vgradient(f, sky[0] ?? fl.base, sky[1] ?? fl.base, 0, s.ground)
    // Far skyline at a quarter of the speed, near rooftops at full speed.
    const far = mix(fl.surface1, sky[1] ?? fl.base, 0.4)
    for (let x = 0; x < f.w; x++) {
      const wx = Math.floor(x + s.dist * 0.25)
      const hgt = 6 + ((wx >> 3) * 7919) % 7
      rect(f, x, s.ground - hgt, 1, hgt, far)
      if ((wx & 7) === 3 && ((wx >> 3) & 1) === 0) rect(f, x, s.ground - hgt + 2, 1, 1, fl.yellow)
    }
    rect(f, 0, s.ground, f.w, f.h - s.ground, fl.surface2)
    for (let x = 0; x < f.w; x++) if (((x + Math.floor(s.dist)) & 3) === 0) rect(f, x, s.ground + 1, 1, 1, fl.overlay0)
    const paint = paletteOf(fl, { g: fl.green, G: mix(fl.green, fl.teal, 0.5), p: fl.peach, w: fl.overlay2, b: fl.sky })
    for (const th of s.things) {
      const art = th.kind === 'pot' ? POT : th.kind === 'tall' ? TALL : th.kind === 'fish' ? FISH : BIRD[(tick >> 2) & 1] ?? POT
      sprite(f, art, paint, th.x, th.y)
    }
    const cat = catPaint(genes, fl)
    if (s.duck > 0 && onGround(s)) sprite(f, CAT_DUCK, cat, CAT_X, s.ground - 4)
    else sprite(f, CAT_RUN[onGround(s) ? (tick >> 2) & 1 : 0] ?? CAT_RUN[0], cat, CAT_X, s.y - 7)
    drawParticles(f, s.particles)
    for (const p of s.pops) number(f, TREAT, p.x, p.y - (0.6 - p.life) * 8, fl.yellow)
  },
  isOver: s => s.isOver,
  score: s => Math.floor(s.dist * POINTS_PER_PX) + s.treats * TREAT,
  maxScore: ms => Math.ceil((ms / 1000) * (MAX_SPEED * POINTS_PER_PX + TREAT / 2)) + 50,
}
