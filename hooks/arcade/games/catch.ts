// Fish Catch: slide the bowl under falling fish; dodge the boots, and never catch a cucumber.
import { renderCatch } from '../render/catch'
import { seeded } from '../../rng'
import type { Rng } from '../../rng'
import { approach, burst, shake, stepParticles, stepShake } from '../engine'
import type { Particle, Shake } from '../engine'
import type { Game } from '../game'

type Kind = 'fish' | 'gold' | 'boot' | 'cucumber'
type Drop = { kind: Kind; x: number; y: number; vy: number }
export type CatchState = {
  w: number; h: number; rng: Rng; t: number; bowl: number; target: number; bowlW: number
  drops: Drop[]; next: number; points: number; combo: number; lives: number; isOver: boolean
  particles: Particle[]; shake: Shake; pops: { n: number; x: number; y: number; life: number }[]
}

const SECONDS = 45
const STEP_PX = 12
const LIVES = 3
const VALUE: Record<Kind, number> = { fish: 10, gold: 30, boot: -15, cucumber: 0 }
const MAX_COMBO_BONUS = 10

const spawnEvery = (t: number) => Math.max(0.42, 0.95 - t * 0.012)
const spawn = (s: CatchState): Drop => {
  const r = s.rng()
  const kind: Kind = r < 0.08 ? 'gold' : r < 0.68 ? 'fish' : r < 0.86 ? 'boot' : 'cucumber'
  return { kind, x: 4 + s.rng() * (s.w - 16), y: -10, vy: 28 + s.t + s.rng() * 16 }
}

export const fishCatch: Game<CatchState> = {
  id: 'catch',
  name: 'Fish Catch',
  blurb: 'Catch falling fish in the bowl, dodge boots and cucumbers.',
  controls: '←/→ or mouse',
  seconds: SECONDS,
  medals: [300, 420, 540],
  init: (seed, mods, w, h) => ({
    w, h, rng: seeded(seed), t: 0, bowl: w / 2, target: w / 2, bowlW: 18 + Math.min(8, mods.hunter * 2),
    drops: [], next: 0.5, points: 0, combo: 0, lives: LIVES, isOver: false,
    particles: [], shake: { t: 0, mag: 0 }, pops: [],
  }),
  step: (s, dt, input) => {
    s.particles = stepParticles(s.particles, dt)
    s.shake = stepShake(s.shake, dt)
    s.pops = s.pops.filter(p => (p.life -= dt) > 0)
    if (s.isOver) return s
    s.t += dt
    for (const i of input) {
      if (i.kind === 'key' && ['left', 'a', 'h'].includes(i.key)) s.target -= STEP_PX
      else if (i.kind === 'key' && ['right', 'd', 'l'].includes(i.key)) s.target += STEP_PX
      else if (i.kind !== 'key') s.target = i.x
    }
    const half = s.bowlW / 2
    s.target = Math.max(half, Math.min(s.w - half, s.target))
    s.bowl = approach(s.bowl, s.target, 18, dt)
    s.next -= dt
    if (s.next <= 0) {
      s.drops.push(spawn(s))
      s.next = spawnEvery(s.t)
    }
    const rim = s.h - 12
    for (const d of s.drops) {
      d.y += d.vy * dt
      const cx = d.x + 6
      if (d.y + 6 >= rim && d.y + 6 < rim + 6 && Math.abs(cx - s.bowl) <= half) {
        d.y = s.h + 20
        if (d.kind === 'cucumber') {
          s.lives--
          s.combo = 0
          s.shake = shake(1.5)
          s.particles.push(...burst(s.rng, cx, rim, 0xa6e3a1, 12, 80))
          if (s.lives <= 0) s.isOver = true
          continue
        }
        const bonus = d.kind === 'boot' ? 0 : Math.min(MAX_COMBO_BONUS, s.combo * 2)
        const gain = VALUE[d.kind] + bonus
        s.points = Math.max(0, s.points + gain)
        s.combo = d.kind === 'boot' ? 0 : s.combo + 1
        if (d.kind === 'boot') s.shake = shake(0.8)
        s.pops.push({ n: Math.abs(gain), x: cx - 6, y: rim - 16, life: 0.6 })
        s.particles.push(...burst(s.rng, cx, rim, d.kind === 'gold' ? 0xf9e2af : 0x89dceb, 6, 60))
      }
    }
    s.drops = s.drops.filter(d => d.y < s.h + 8)
    if (s.t >= SECONDS) s.isOver = true
    return s
  },
  draw: (s, f, look) => renderCatch(s, f, look),
  isOver: s => s.isOver,
  score: s => s.points,
  maxScore: ms => Math.ceil((ms / 1000 / 0.42) * (VALUE.gold + MAX_COMBO_BONUS)) + 50,
}
