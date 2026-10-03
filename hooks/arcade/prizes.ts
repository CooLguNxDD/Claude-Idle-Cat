// Arcade prizes: a paid round may win the cat a random bonus; better medals raise the odds.
import type { Cat, Home, Personality } from '../../types'
import { CRITTERS } from '../critters'
import { coinRate } from '../game'
import { weighted } from '../rng'
import type { Rng } from '../rng'
import type { Medal } from './medals'

export type PrizeId = 'purse' | 'trick' | 'snack' | 'zoomies' | 'cuddle' | 'capsule'
// What a prize pays; finishGame folds it into the round's own payout.
export type Prize = { id: PrizeId; text: string; coins: number; xp: number; cat: (c: Cat) => Cat; critter?: string }

export const PRIZE_CHANCE: Record<Medal | 'none', number> = { none: 0.15, bronze: 0.25, silver: 0.35, gold: 0.5 }
// Each personality is twice as likely to win the prize it loves.
const LOVES: Record<PrizeId, Personality> = {
  purse: 'greedy', trick: 'curious', snack: 'lazy', zoomies: 'playful', cuddle: 'cuddly', capsule: 'shy',
}
const IDS = Object.keys(LOVES) as PrizeId[]
export const SNACK = 20
export const ZOOMIES = 10
export const CUDDLE = 5

const CRITTER_WEIGHTS = Object.fromEntries(CRITTERS.map(c => [c.id, c.weight])) as Record<string, number>

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const same = (c: Cat) => c

const prizeOf = (id: PrizeId, home: Home, cat: Cat, rng: Rng): Prize => {
  if (id === 'purse') {
    const coins = Math.max(10, Math.round(coinRate(home) * 4))
    return { id, coins, xp: 0, cat: same, text: `🎁 found a coin purse under the claw machine (+${coins}c)` }
  }
  if (id === 'trick') {
    const xp = 4 + cat.level
    return { id, coins: 0, xp, cat: same, text: `🎁 learned a new trick (+${xp}xp)` }
  }
  if (id === 'snack') return { id, coins: 0, xp: 0, cat: c => ({ ...c, hunger: clamp(c.hunger + SNACK) }),
    text: `🎁 won a tuna snack (+${clamp(cat.hunger + SNACK) - cat.hunger} hunger)` }
  if (id === 'zoomies') return { id, coins: 0, xp: 0, cat: c => ({ ...c, energy: clamp(c.energy + ZOOMIES) }),
    text: `🎁 got the zoomies (+${ZOOMIES} energy)` }
  if (id === 'cuddle') return { id, coins: 0, xp: 0, cat: c => ({ ...c, friendship: c.friendship + CUDDLE }),
    text: `🎁 a victory cuddle (+${CUDDLE} friendship)` }
  const critter = weighted(rng, CRITTER_WEIGHTS)
  const name = CRITTERS.find(c => c.id === critter)?.name ?? critter
  return { id, coins: 0, xp: 0, cat: same, critter, text: `🎁 a prize capsule held a ${name}!` }
}

// Rolls once for the round; null means no prize this time.
export const rollPrize = (home: Home, cat: Cat, medal: Medal | null, rng: Rng): Prize | null => {
  if (rng() >= PRIZE_CHANCE[medal ?? 'none']) return null
  const weights = Object.fromEntries(IDS.map(id => [id, LOVES[id] === cat.genes.personality ? 2 : 1])) as Record<PrizeId, number>
  return prizeOf(weighted(rng, weights), home, cat, rng)
}
