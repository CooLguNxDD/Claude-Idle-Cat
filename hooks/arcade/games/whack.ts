// Whack-a-Mouse: mice pop out of a 3x3 board; bop them, but never the owner's slipper.
import { renderWhack } from '../render/whack'
import { seeded } from '../../rng'
import type { Rng } from '../../rng'
import { burst, shake, stepParticles, stepShake } from '../engine'
import type { Particle, Shake } from '../engine'
import type { Game } from '../game'

type Kind = 'mouse' | 'gold' | 'slipper'
type Pop = { kind: Kind; up: number; life: number; isHit: boolean }
export type WhackState = {
  w: number; h: number; rng: Rng; t: number; holes: (Pop | null)[]; next: number; bonusUp: number
  points: number; hits: number; isOver: boolean; swipe: { hole: number; life: number } | null
  particles: Particle[]; shake: Shake; pops: { n: number; x: number; y: number; life: number }[]
}

const SECONDS = 40
export const RISE_S = 0.12
const VALUE: Record<Kind, number> = { mouse: 10, gold: 25, slipper: -20 }
const MIN_GAP_S = 0.4
// Holes are numbered like a phone keypad: 1 2 3 on top.
export const cellOf = (s: WhackState, hole: number) => {
  const cw = s.w / 3
  const ch = (s.h - 4) / 3
  return { x: (hole % 3) * cw, y: 4 + Math.floor(hole / 3) * ch, cw, ch }
}
const holeAt = (s: WhackState, x: number, y: number) => {
  const col = Math.floor(x / (s.w / 3))
  const row = Math.floor((y - 4) / ((s.h - 4) / 3))
  return col >= 0 && col < 3 && row >= 0 && row < 3 ? row * 3 + col : -1
}

const bop = (s: WhackState, hole: number) => {
  if (hole < 0) return
  s.swipe = { hole, life: 0.15 }
  const pop = s.holes[hole]
  if (!pop || pop.isHit || pop.up < RISE_S * 0.5) return
  pop.isHit = true
  pop.life = Math.min(pop.life, 0.2)
  const gain = VALUE[pop.kind]
  s.points = Math.max(0, s.points + gain)
  const c = cellOf(s, hole)
  s.pops.push({ n: Math.abs(gain), x: c.x + c.cw / 2 - 3, y: c.y, life: 0.6 })
  if (pop.kind === 'slipper') s.shake = shake(1.5)
  else {
    s.hits++
    s.particles.push(...burst(s.rng, c.x + c.cw / 2, c.y + c.ch / 2, pop.kind === 'gold' ? 0xf9e2af : 0xcdd6f4, 8, 30))
  }
}

export const whack: Game<WhackState> = {
  id: 'whack',
  name: 'Whack-a-Mouse',
  blurb: 'Bop the mice as they pop up. Leave the slipper alone!',
  controls: 'keys 1–9 (1 2 3 on top) or click',
  seconds: SECONDS,
  medals: [200, 350, 500],
  init: (seed, mods, w, h) => ({
    w, h, rng: seeded(seed), t: 0, holes: Array(9).fill(null), next: 0.6, bonusUp: Math.min(0.3, mods.hunter * 0.05),
    points: 0, hits: 0, isOver: false, swipe: null, particles: [], shake: { t: 0, mag: 0 }, pops: [],
  }),
  step: (s, dt, input) => {
    s.particles = stepParticles(s.particles, dt)
    s.shake = stepShake(s.shake, dt)
    s.pops = s.pops.filter(p => (p.life -= dt) > 0)
    if (s.swipe && (s.swipe.life -= dt) <= 0) s.swipe = null
    if (s.isOver) return s
    s.t += dt
    for (const i of input) {
      if (i.kind === 'key' && /^[1-9]$/.test(i.key)) bop(s, Number(i.key) - 1)
      else if (i.kind === 'down') bop(s, holeAt(s, i.x, i.y))
    }
    s.holes = s.holes.map(p => {
      if (!p) return null
      p.up += dt
      return (p.life -= dt) > 0 ? p : null
    })
    s.next -= dt
    if (s.next <= 0) {
      const free = s.holes.map((p, i) => (p ? -1 : i)).filter(i => i >= 0)
      const hole = free[Math.floor(s.rng() * free.length)]
      if (hole !== undefined) {
        const r = s.rng()
        const kind: Kind = r < 0.07 ? 'gold' : r < 0.82 ? 'mouse' : 'slipper'
        s.holes[hole] = { kind, up: 0, life: Math.max(0.55, 1.15 - s.t * 0.014) + s.bonusUp, isHit: false }
      }
      s.next = Math.max(MIN_GAP_S, 0.85 - s.t * 0.012)
    }
    if (s.t >= SECONDS) s.isOver = true
    return s
  },
  draw: (s, f, look) => renderWhack(s, f, look),
  isOver: s => s.isOver,
  score: s => s.points,
  maxScore: ms => Math.ceil((ms / 1000 / MIN_GAP_S) * VALUE.gold) + 50,
}
