// Rooftop Dash: the cat runs the rooftops, jumping flowerpots and ducking pigeons (Chrome dino style).
import { renderDash } from '../render/dash'
import { DASH_ART } from '../art/dash'
import { seeded } from '../../rng'
import type { Rng } from '../../rng'
import { burst, shake, stepParticles, stepShake } from '../engine'
import type { Particle, Shake } from '../engine'
import { isKey } from '../game'
import type { Game } from '../game'

type Kind = 'pot' | 'tall' | 'bird' | 'fish'
type Thing = { kind: Kind; x: number; y: number; w: number; h: number; isTaken?: boolean }
export type DashState = {
  w: number; h: number; ground: number; rng: Rng; t: number
  y: number; vy: number; duck: number; buffer: number
  speed: number; ramp: number; dist: number; treats: number
  things: Thing[]; gap: number; isOver: boolean
  particles: Particle[]; shake: Shake; pops: { x: number; y: number; life: number }[]
}

export const GRAVITY = 520
export const JUMP_V = 196
export const CAT_X = 10
const START_SPEED = 64
const MAX_SPEED = 168
const DUCK_S = 0.45
const BUFFER_S = 0.12
const BIRDS_AFTER_S = 15
const POINTS_PER_PX = 0.125
export const TREAT = 25

const SIZE: Record<Kind, [number, number]> = {
  pot: [DASH_ART.pot.width, DASH_ART.pot.height], tall: [DASH_ART.tall.width, DASH_ART.tall.height],
  bird: [DASH_ART.bird.width, DASH_ART.bird.height], fish: [DASH_ART.fish.width, DASH_ART.fish.height],
}

export const onGround = (s: DashState) => s.y >= s.ground && s.vy >= 0
const catBox = (s: DashState) =>
  s.duck > 0 && onGround(s) ? { x: CAT_X + 2, y: s.ground - 8, w: 20, h: 8 } : { x: CAT_X + 4, y: s.y - 11 + 2, w: 16, h: 9 }
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: Thing) =>
  a.x < b.x + b.w - 2 && a.x + a.w > b.x + 2 && a.y < b.y + b.h && a.y + a.h > b.y

const spawn = (s: DashState): Thing => {
  const roll = s.rng()
  const kind: Kind = s.t > BIRDS_AFTER_S && roll < 0.3 ? 'bird' : roll < 0.6 ? 'pot' : roll < 0.85 ? 'tall' : 'fish'
  const [w, h] = SIZE[kind]
  const y = kind === 'bird' ? s.ground - 14 - Math.floor(s.rng() * 2) * 2 : kind === 'fish' ? s.ground - 34 : s.ground - h
  return { kind, x: s.w + 4, y, w, h }
}

export const dash: Game<DashState> = {
  id: 'dash',
  name: 'Rooftop Dash',
  blurb: 'Jump the flowerpots, duck the pigeons, grab fish treats.',
  controls: 'space/↑ jump · ↓ duck',
  seconds: 60,
  medals: [250, 550, 850],
  init: (seed, mods, w, h) => ({
    w, h, ground: h - 10, rng: seeded(seed), t: 0, y: h - 10, vy: 0, duck: 0, buffer: 0,
    speed: START_SPEED, ramp: 2.8 / (1 + 0.15 * mods.dreamer), dist: 0, treats: 0,
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
      if (!onGround(s)) s.vy += 240
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
      if (wasAir && s.vy > 0) s.particles.push(...burst(s.rng, CAT_X + 10, s.ground, 0xffffff, 4, 36))
      s.vy = 0
    }
    s.speed = Math.min(MAX_SPEED, s.speed + s.ramp * dt)
    const move = s.speed * dt
    s.dist += move
    for (const th of s.things) th.x -= move
    s.things = s.things.filter(th => th.x + th.w > -4 && !th.isTaken)
    s.gap -= move
    if (s.gap <= 0) {
      s.things.push(spawn(s))
      // The gap grows with speed so a jump always fits.
      s.gap = s.speed * (0.75 + s.rng() * 0.9) + 16
    }
    const box = catBox(s)
    for (const th of s.things) {
      if (!overlaps(box, th)) continue
      if (th.kind === 'fish') {
        th.isTaken = true
        s.treats++
        s.pops.push({ x: th.x, y: th.y - 12, life: 0.6 })
        s.particles.push(...burst(s.rng, th.x + 4, th.y + 2, 0xf9e2af, 8, 60))
        continue
      }
      s.isOver = true
      s.shake = shake(1.5)
      s.particles.push(...burst(s.rng, box.x + 10, box.y + 6, 0xf38ba8, 14, 90))
    }
    if (s.t >= dash.seconds) s.isOver = true
    return s
  },
  draw: (s, f, look) => renderDash(s, f, look),
  isOver: s => s.isOver,
  score: s => Math.floor(s.dist * POINTS_PER_PX) + s.treats * TREAT,
  maxScore: ms => Math.ceil((ms / 1000) * (MAX_SPEED * POINTS_PER_PX + TREAT / 2)) + 50,
}
