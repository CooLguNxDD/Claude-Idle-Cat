// Laser Chase: the red dot darts around the floor; aim and pounce on it for combo points.
import { renderLaser } from '../render/laser'
import { seeded } from '../../rng'
import type { Rng } from '../../rng'
import { approach, burst, easeOut, shake, stepParticles, stepShake } from '../engine'
import type { Particle, Shake } from '../engine'
import type { Game } from '../game'

export type LaserState = {
  w: number; h: number; rng: Rng; t: number
  dot: { x: number; y: number; tx: number; ty: number; pause: number }
  aim: { x: number; y: number }
  cat: { x: number; y: number; fromX: number; fromY: number; tx: number; ty: number; leap: number }
  cooldown: number; combo: number; points: number; catches: number; reach: number; isOver: boolean
  particles: Particle[]; shake: Shake; pops: { n: number; x: number; y: number; life: number }[]; trail: { x: number; y: number }[]
}

const SECONDS = 45
export const LEAP_S = 0.2
const COOLDOWN_S = 0.45
const AIM_STEP = 8
const MAX_COMBO = 5
const POINTS = 10

const wander = (s: LaserState) => {
  s.dot.tx = 6 + s.rng() * (s.w - 12)
  s.dot.ty = 6 + s.rng() * (s.h - 12)
  s.dot.pause = s.rng() < 0.3 ? 0.2 + s.rng() * 0.5 : 0
}

const pounce = (s: LaserState, x: number, y: number) => {
  if (s.cooldown > 0) return
  s.aim = { x, y }
  s.cat = { ...s.cat, fromX: s.cat.x, fromY: s.cat.y, tx: x, ty: y, leap: LEAP_S }
  s.cooldown = COOLDOWN_S
}

export const laser: Game<LaserState> = {
  id: 'laser',
  name: 'Laser Chase',
  blurb: 'Pounce on the darting red dot; catches in a row multiply.',
  controls: 'click the dot · or arrows aim + space',
  seconds: SECONDS,
  medals: [150, 350, 600],
  init: (seed, mods, w, h) => {
    const s: LaserState = {
      w, h, rng: seeded(seed), t: 0, dot: { x: w * 0.7, y: h * 0.4, tx: 0, ty: 0, pause: 0 },
      aim: { x: w / 2, y: h / 2 }, cat: { x: w / 2, y: h - 16, fromX: 0, fromY: 0, tx: 0, ty: 0, leap: 0 },
      cooldown: 0, combo: 0, points: 0, catches: 0, reach: 8 + Math.min(6, mods.hunter), isOver: false,
      particles: [], shake: { t: 0, mag: 0 }, pops: [], trail: [],
    }
    wander(s)
    return s
  },
  step: (s, dt, input) => {
    s.particles = stepParticles(s.particles, dt, 20)
    s.shake = stepShake(s.shake, dt)
    s.pops = s.pops.filter(p => (p.life -= dt) > 0)
    if (s.isOver) return s
    s.t += dt
    s.cooldown = Math.max(0, s.cooldown - dt)
    for (const i of input) {
      if (i.kind === 'down') pounce(s, i.x, i.y)
      else if (i.kind === 'move') s.aim = { x: i.x, y: i.y }
      else if (i.kind === 'key') {
        const k = i.key
        if (k === 'left' || k === 'a') s.aim.x -= AIM_STEP
        if (k === 'right' || k === 'd') s.aim.x += AIM_STEP
        if (k === 'up' || k === 'w') s.aim.y -= AIM_STEP
        if (k === 'down' || k === 's') s.aim.y += AIM_STEP
        if (k === ' ' || k === 'space' || k === 'return') pounce(s, s.aim.x, s.aim.y)
      }
    }
    s.aim = { x: Math.max(0, Math.min(s.w - 1, s.aim.x)), y: Math.max(0, Math.min(s.h - 1, s.aim.y)) }
    // The dot gets quicker as the round goes on, with little pauses that tempt a pounce.
    const d = s.dot
    if (d.pause > 0) d.pause -= dt
    else {
      d.x = approach(d.x, d.tx, 3 + s.t * 0.08, dt)
      d.y = approach(d.y, d.ty, 3 + s.t * 0.08, dt)
      if (Math.hypot(d.tx - d.x, d.ty - d.y) < 3) wander(s)
    }
    s.trail = [{ x: d.x, y: d.y }, ...s.trail].slice(0, 5)
    if (s.cat.leap > 0) {
      s.cat.leap = Math.max(0, s.cat.leap - dt)
      const k = easeOut(1 - s.cat.leap / LEAP_S)
      s.cat.x = s.cat.fromX + (s.cat.tx - s.cat.fromX) * k
      s.cat.y = s.cat.fromY + (s.cat.ty - s.cat.fromY) * k
      if (s.cat.leap === 0) {
        if (Math.hypot(d.x - s.cat.x, d.y - s.cat.y) <= s.reach) {
          s.combo = Math.min(MAX_COMBO, s.combo + 1)
          const gain = POINTS * s.combo
          s.points += gain
          s.catches++
          s.pops.push({ n: gain, x: d.x - 6, y: d.y - 14, life: 0.6 })
          s.particles.push(...burst(s.rng, d.x, d.y, 0xf38ba8, 10, 70))
          s.shake = shake(0.6, 0.15)
          d.x = 6 + s.rng() * (s.w - 12)
          d.y = 6 + s.rng() * (s.h - 12)
          wander(s)
        } else s.combo = 0
      }
    }
    if (s.t >= SECONDS) s.isOver = true
    return s
  },
  draw: (s, f, look) => renderLaser(s, f, look),
  isOver: s => s.isOver,
  score: s => s.points,
  maxScore: ms => Math.ceil((ms / 1000 / (COOLDOWN_S)) * POINTS * MAX_COMBO) + 50,
}
