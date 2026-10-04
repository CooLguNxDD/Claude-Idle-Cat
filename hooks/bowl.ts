import type { Home } from '../types'
import { track } from './collection'

export const BOWL_CAP = 10
export const PORTION_COST = 5

/** A saved bowl, repaired: missing or bad data gives 3 portions, food is a whole number within the cap. */
export const normalizeBowl =(bowl: unknown): { food: number } => {
  if (!bowl || typeof bowl !== 'object' || !Number.isFinite((bowl as { food?: unknown }).food)) return { food: 3 }
  return { food: Math.max(0, Math.min(BOWL_CAP, Math.floor((bowl as { food: number }).food))) }
}

/** Buy up to n portions at 5c each, never past the cap. One track('feed') per portion. */
export const fillBowl = (home: Home, n: number, now: number): Home => {
  const want = Math.floor(n)
  if (!Number.isFinite(want) || want <= 0) return { ...home, log: 'Usage: fill at least one portion.' }
  const room = BOWL_CAP - home.bowl.food
  if (room <= 0) return { ...home, log: 'The bowl is full.' }
  const portions = Math.min(want, room, Math.floor(home.coins / PORTION_COST))
  if (portions <= 0) return { ...home, log: 'Not enough coins for fish (5).' }
  const filled = { ...home, coins: home.coins - portions * PORTION_COST, bowl: { food: home.bowl.food + portions },
    effect: { kind: 'fish' as const, at: now },
    log: portions === 1 ? 'You add a portion to the bowl.' : `You add ${portions} portions to the bowl.` }
  return track(filled, 'feed', portions, now)
}
