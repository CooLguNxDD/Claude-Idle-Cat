// Cat Tank (Insaniquarium style): feed fish so they grow and drop coins, click the coins, swat the raiding crow.
import { renderTank } from '../render/tank'
import { seeded } from '../../rng'
import type { Rng } from '../../rng'
import { approach, burst, shake, stepParticles, stepShake } from '../engine'
import type { Particle, Shake } from '../engine'
import type { Game } from '../game'

type Fish = { x: number; y: number; tx: number; ty: number; stage: 0 | 1 | 2; fed: number; hunger: number; drop: number; isDead: boolean }
type Coin = { x: number; y: number; value: number; floor: number }
type Crow = { x: number; y: number; hits: number; target: number; warn: number }
export type TankState = {
  w: number; h: number; rng: Rng; t: number; fish: Fish[]; food: { x: number; y: number }[]; coins: Coin[]
  crow: Crow | null; raids: number[]; bank: number; spent: number; aim: { x: number; y: number }
  maxFood: number; crowHits: number; isOver: boolean
  particles: Particle[]; shake: Shake; pops: { n: number; x: number; y: number; life: number }[]
}

const SECONDS = 60
export const FRY_PRICE = 20
const MAX_FISH = 6
const FEEDS_TO_GROW = [2, 3] as const
const HUNGRY_AT = 0.45
const STARVE_S = 14
const DROP_EVERY = [0, 4.5, 4] as const
const COIN = [0, 5, 15] as const
const FLOOR_S = 1.5
const CROW_BOUNTY = 25
const REACH = 6

export const waterTop = 8
export const floorOf = (s: TankState) => s.h - 6
const newFry = (s: TankState): Fish => ({
  x: 8 + s.rng() * (s.w - 20), y: waterTop + 8 + s.rng() * 16, tx: s.w / 2, ty: s.h / 2, stage: 0, fed: 0, hunger: 0.2, drop: 2, isDead: false,
})
const roam = (s: TankState, f: Fish) => {
  f.tx = 6 + s.rng() * (s.w - 20)
  f.ty = waterTop + 6 + s.rng() * (floorOf(s) - waterTop - 16)
}

// A click (or space at the cursor) grabs a coin, swats the crow, or drops a pellet into the water.
const click = (s: TankState, x: number, y: number) => {
  if (s.crow && s.crow.warn <= 0 && Math.abs(x - (s.crow.x + 6)) <= 8 && Math.abs(y - (s.crow.y + 4)) <= 6) {
    s.crow.hits--
    s.shake = shake(0.8, 0.15)
    s.particles.push(...burst(s.rng, x, y, 0x6c7086, 6, 60))
    if (s.crow.hits <= 0) {
      s.bank += CROW_BOUNTY
      s.pops.push({ n: CROW_BOUNTY, x: s.crow.x, y: s.crow.y - 12, life: 0.7 })
      s.crow = null
    }
    return
  }
  const coin = s.coins.find(c => Math.abs(c.x - x) <= REACH && Math.abs(c.y - y) <= REACH)
  if (coin) {
    s.coins = s.coins.filter(c => c !== coin)
    s.bank += coin.value
    s.pops.push({ n: coin.value, x: coin.x - 6, y: coin.y - 12, life: 0.6 })
    s.particles.push(...burst(s.rng, coin.x, coin.y, coin.value > 5 ? 0xf9e2af : 0xbac2de, 5, 50))
    return
  }
  if (y > waterTop && s.food.length < s.maxFood) s.food.push({ x, y: Math.max(waterTop + 1, y) })
}

export const buyFry = (s: TankState) => {
  if (s.bank < FRY_PRICE || s.fish.filter(f => !f.isDead).length >= MAX_FISH) return
  s.bank -= FRY_PRICE
  s.spent += FRY_PRICE
  s.fish.push(newFry(s))
}

export const tank: Game<TankState> = {
  id: 'tank',
  name: 'Cat Tank',
  blurb: 'Feed the fish so they grow and drop coins; grab the coins; swat the crow.',
  controls: `click water to feed · click coins · b buys a fry (${FRY_PRICE})`,
  seconds: SECONDS,
  medals: [100, 180, 260],
  init: (seed, mods, w, h) => {
    const s: TankState = {
      w, h, rng: seeded(seed), t: 0, fish: [], food: [], coins: [], crow: null, raids: [20, 42], bank: 0, spent: 0,
      aim: { x: w / 2, y: h / 2 }, maxFood: 3 + Math.min(2, Math.floor(mods.cuddler / 2)),
      crowHits: Math.max(2, 4 - Math.floor(mods.hunter / 2)), isOver: false, particles: [], shake: { t: 0, mag: 0 }, pops: [],
    }
    s.fish = [newFry(s), newFry(s)]
    return s
  },
  step: (s, dt, input) => {
    s.particles = stepParticles(s.particles, dt, 10)
    s.shake = stepShake(s.shake, dt)
    s.pops = s.pops.filter(p => (p.life -= dt) > 0)
    if (s.isOver) return s
    s.t += dt
    for (const i of input) {
      if (i.kind === 'down') click(s, i.x, i.y)
      else if (i.kind === 'move') s.aim = { x: i.x, y: i.y }
      else if (i.kind === 'key') {
        if (i.key === 'b') buyFry(s)
        else if (i.key === 'left') s.aim.x -= 8
        else if (i.key === 'right') s.aim.x += 8
        else if (i.key === 'up') s.aim.y -= 8
        else if (i.key === 'down') s.aim.y += 8
        else if (i.key === ' ' || i.key === 'space' || i.key === 'return') click(s, s.aim.x, s.aim.y)
      }
    }
    s.aim = { x: Math.max(0, Math.min(s.w - 1, s.aim.x)), y: Math.max(0, Math.min(s.h - 1, s.aim.y)) }
    const floor = floorOf(s)
    for (const p of s.food) p.y += 18 * dt
    s.food = s.food.filter(p => p.y < floor)
    for (const f of s.fish) {
      if (f.isDead) {
        f.y = Math.max(waterTop, f.y - 12 * dt)
        continue
      }
      f.hunger += dt / STARVE_S
      if (f.hunger >= 1) {
        f.isDead = true
        continue
      }
      const meal = f.hunger > HUNGRY_AT
        ? s.food.reduce<{ x: number; y: number } | null>((best, p) =>
          !best || Math.hypot(p.x - f.x, p.y - f.y) < Math.hypot(best.x - f.x, best.y - f.y) ? p : best, null)
        : null
      if (meal) {
        f.tx = meal.x - 4
        f.ty = meal.y - 2
        if (Math.hypot(meal.x - (f.x + 4), meal.y - (f.y + 2)) < 5) {
          s.food = s.food.filter(p => p !== meal)
          f.hunger = 0
          f.fed++
          const need = f.stage < 2 ? FEEDS_TO_GROW[f.stage as 0 | 1] : Infinity
          if (f.fed >= need) {
            f.stage = (f.stage + 1) as 1 | 2
            f.fed = 0
            s.particles.push(...burst(s.rng, f.x + 6, f.y + 2, 0xf9e2af, 10, 50))
          }
          roam(s, f)
        }
      } else if (Math.hypot(f.tx - f.x, f.ty - f.y) < 3) roam(s, f)
      const speed = meal ? 3.5 : 1.2
      f.x = approach(f.x, f.tx, speed, dt)
      f.y = approach(f.y, f.ty, speed, dt)
      if (f.stage > 0 && (f.drop -= dt) <= 0) {
        f.drop = DROP_EVERY[f.stage] + s.rng()
        s.coins.push({ x: f.x + 6, y: f.y + 4, value: COIN[f.stage], floor: 0 })
      }
    }
    for (const c of s.coins) {
      if (c.y < floor - 2) c.y = Math.min(floor - 2, c.y + 12 * dt)
      else c.floor += dt
    }
    s.coins = s.coins.filter(c => c.floor < FLOOR_S)
    // Crow raids: a warning flash, then it swoops at a fish and eats it unless swatted.
    if (!s.crow && s.raids[0] !== undefined && s.t >= s.raids[0]) {
      s.raids = s.raids.slice(1)
      const alive = s.fish.map((f, i) => (f.isDead ? -1 : i)).filter(i => i >= 0)
      if (alive.length) s.crow = { x: s.rng() < 0.5 ? -16 : s.w + 2, y: 0, hits: s.crowHits, target: alive[Math.floor(s.rng() * alive.length)] ?? 0, warn: 1 }
    }
    if (s.crow) {
      const c = s.crow
      const prey = s.fish[c.target]
      if (c.warn > 0) c.warn -= dt
      else if (!prey || prey.isDead) s.crow = null
      else {
        c.x = approach(c.x, prey.x - 2, 0.9, dt)
        c.y = approach(c.y, prey.y - 4, 0.9, dt)
        if (Math.hypot(c.x - prey.x, c.y - prey.y) < 5) {
          prey.isDead = true
          prey.y = -20
          s.shake = shake(1.2)
          s.crow = null
        }
      }
    }
    if (s.t >= SECONDS) s.isOver = true
    return s
  },
  draw: (s, f, look) => renderTank(s, f, look),
  isOver: s => s.isOver,
  score: s => s.bank,
  maxScore: ms => Math.ceil((ms / 1000) * ((MAX_FISH * COIN[2]) / DROP_EVERY[2])) + CROW_BOUNTY * 2 + 50,
}
