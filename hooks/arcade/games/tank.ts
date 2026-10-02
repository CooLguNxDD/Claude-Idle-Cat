// Cat Tank (Insaniquarium style): feed fish so they grow and drop coins, click the coins, swat the raiding crow.
import { seeded } from '../../rng'
import type { Rng } from '../../rng'
import { mix } from '../../theme'
import { approach, blend, burst, clear, drawParticles, number, rect, shake, sprite, stepParticles, stepShake, vgradient } from '../engine'
import type { Particle, Shake } from '../engine'
import type { Game } from '../game'
import { CAT_FRONT, catPaint, paletteOf } from '../sprites'

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
const REACH = 3
const ART = {
  fry: ['.aa', 'aaa'],
  fish: ['.aa..a', 'aaaaaa', '.aa..a'],
  gold: ['..yy...', '.yyyy.y', 'yyEyyyy', '.yyyy.y'],
  crow: ['.kk....', 'kEkkk.k', '.kkkkkk', '..k.k..'],
}

const waterTop = 4
const floorOf = (s: TankState) => s.h - 3
const newFry = (s: TankState): Fish => ({
  x: 4 + s.rng() * (s.w - 10), y: waterTop + 4 + s.rng() * 8, tx: s.w / 2, ty: s.h / 2, stage: 0, fed: 0, hunger: 0.2, drop: 2, isDead: false,
})
const roam = (s: TankState, f: Fish) => {
  f.tx = 3 + s.rng() * (s.w - 10)
  f.ty = waterTop + 3 + s.rng() * (floorOf(s) - waterTop - 8)
}

// A click (or space at the cursor) grabs a coin, swats the crow, or drops a pellet into the water.
const click = (s: TankState, x: number, y: number) => {
  if (s.crow && s.crow.warn <= 0 && Math.abs(x - (s.crow.x + 3)) <= 4 && Math.abs(y - (s.crow.y + 2)) <= 3) {
    s.crow.hits--
    s.shake = shake(0.8, 0.15)
    s.particles.push(...burst(s.rng, x, y, 0x6c7086, 6, 30))
    if (s.crow.hits <= 0) {
      s.bank += CROW_BOUNTY
      s.pops.push({ n: CROW_BOUNTY, x: s.crow.x, y: s.crow.y - 6, life: 0.7 })
      s.crow = null
    }
    return
  }
  const coin = s.coins.find(c => Math.abs(c.x - x) <= REACH && Math.abs(c.y - y) <= REACH)
  if (coin) {
    s.coins = s.coins.filter(c => c !== coin)
    s.bank += coin.value
    s.pops.push({ n: coin.value, x: coin.x - 3, y: coin.y - 6, life: 0.6 })
    s.particles.push(...burst(s.rng, coin.x, coin.y, coin.value > 5 ? 0xf9e2af : 0xbac2de, 5, 25))
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
        else if (i.key === 'left') s.aim.x -= 4
        else if (i.key === 'right') s.aim.x += 4
        else if (i.key === 'up') s.aim.y -= 4
        else if (i.key === 'down') s.aim.y += 4
        else if (i.key === ' ' || i.key === 'space' || i.key === 'return') click(s, s.aim.x, s.aim.y)
      }
    }
    s.aim = { x: Math.max(0, Math.min(s.w - 1, s.aim.x)), y: Math.max(0, Math.min(s.h - 1, s.aim.y)) }
    const floor = floorOf(s)
    for (const p of s.food) p.y += 9 * dt
    s.food = s.food.filter(p => p.y < floor)
    for (const f of s.fish) {
      if (f.isDead) {
        f.y = Math.max(waterTop, f.y - 6 * dt)
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
        f.tx = meal.x - 2
        f.ty = meal.y - 1
        if (Math.hypot(meal.x - (f.x + 2), meal.y - (f.y + 1)) < 2.5) {
          s.food = s.food.filter(p => p !== meal)
          f.hunger = 0
          f.fed++
          const need = f.stage < 2 ? FEEDS_TO_GROW[f.stage as 0 | 1] : Infinity
          if (f.fed >= need) {
            f.stage = (f.stage + 1) as 1 | 2
            f.fed = 0
            s.particles.push(...burst(s.rng, f.x + 3, f.y + 1, 0xf9e2af, 10, 25))
          }
          roam(s, f)
        }
      } else if (Math.hypot(f.tx - f.x, f.ty - f.y) < 1.5) roam(s, f)
      const speed = meal ? 3.5 : 1.2
      f.x = approach(f.x, f.tx, speed, dt)
      f.y = approach(f.y, f.ty, speed, dt)
      if (f.stage > 0 && (f.drop -= dt) <= 0) {
        f.drop = DROP_EVERY[f.stage] + s.rng()
        s.coins.push({ x: f.x + 3, y: f.y + 2, value: COIN[f.stage], floor: 0 })
      }
    }
    for (const c of s.coins) {
      if (c.y < floor - 1) c.y = Math.min(floor - 1, c.y + 6 * dt)
      else c.floor += dt
    }
    s.coins = s.coins.filter(c => c.floor < FLOOR_S)
    // Crow raids: a warning flash, then it swoops at a fish and eats it unless swatted.
    if (!s.crow && s.raids[0] !== undefined && s.t >= s.raids[0]) {
      s.raids = s.raids.slice(1)
      const alive = s.fish.map((f, i) => (f.isDead ? -1 : i)).filter(i => i >= 0)
      if (alive.length) s.crow = { x: s.rng() < 0.5 ? -8 : s.w + 1, y: 0, hits: s.crowHits, target: alive[Math.floor(s.rng() * alive.length)] ?? 0, warn: 1 }
    }
    if (s.crow) {
      const c = s.crow
      const prey = s.fish[c.target]
      if (c.warn > 0) c.warn -= dt
      else if (!prey || prey.isDead) s.crow = null
      else {
        c.x = approach(c.x, prey.x - 1, 0.9, dt)
        c.y = approach(c.y, prey.y - 2, 0.9, dt)
        if (Math.hypot(c.x - prey.x, c.y - prey.y) < 2.5) {
          prey.isDead = true
          prey.y = -10
          s.shake = shake(1.2)
          s.crow = null
        }
      }
    }
    if (s.t >= SECONDS) s.isOver = true
    return s
  },
  draw: (s, f, { f: fl, genes, tick }) => {
    clear(f, fl.base)
    vgradient(f, mix(fl.sky, fl.base, 0.35), mix(fl.blue, fl.crust, 0.55), waterTop, floorOf(s))
    rect(f, 0, 0, f.w, waterTop, fl.mantle)
    rect(f, 0, floorOf(s), f.w, f.h - floorOf(s), mix(fl.yellow, fl.peach, 0.4))
    for (let x = 0; x < f.w; x += 2) blend(f, x + ((tick >> 3) & 1), waterTop, fl.text, 0.35)
    for (let x = 3; x < f.w; x += 11) rect(f, x, floorOf(s) - 3 - (x % 3), 1, 3 + (x % 3), mix(fl.green, fl.teal, 0.5))
    sprite(f, CAT_FRONT, catPaint(genes, fl), f.w - 9, -2)
    const paint = paletteOf(fl, { a: fl.peach, y: fl.yellow, E: fl.crust, k: mix(fl.crust, fl.overlay0, 0.3) })
    for (const p of s.food) rect(f, p.x, p.y, 1, 1, fl.maroon)
    for (const fish of s.fish) {
      const art = fish.stage === 0 ? ART.fry : fish.stage === 1 ? ART.fish : ART.gold
      const look = fish.isDead ? paletteOf(fl, { a: fl.overlay0, y: fl.overlay0, E: fl.crust }) : paint
      sprite(f, art, look, fish.x, fish.y, fish.tx > fish.x)
    }
    for (const c of s.coins) {
      const col = c.value > 5 ? fl.yellow : fl.subtext1
      rect(f, c.x - 1, c.y - 1, 2, 2, (tick >> 2) % 3 === 0 ? mix(col, 0xffffff, 0.5) : col)
    }
    if (s.crow) {
      if (s.crow.warn > 0 && (tick >> 1) % 2 === 0) for (let x = 0; x < f.w; x++) blend(f, x, waterTop, fl.red, 0.9)
      else sprite(f, ART.crow, paint, s.crow.x, s.crow.y, s.crow.x < s.w / 2)
    }
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) blend(f, s.aim.x + dx, s.aim.y + dy, fl.lavender, 0.6)
    number(f, s.bank, 1, 0, fl.yellow)
    drawParticles(f, s.particles)
    for (const p of s.pops) number(f, p.n, p.x, p.y - (0.6 - p.life) * 8, fl.yellow)
  },
  isOver: s => s.isOver,
  score: s => s.bank,
  maxScore: ms => Math.ceil((ms / 1000) * ((MAX_FISH * COIN[2]) / DROP_EVERY[2])) + CROW_BOUNTY * 2 + 50,
}
