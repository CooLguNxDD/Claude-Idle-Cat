import type { Home } from '../types'
import { track } from './collection'
import { furniture, type BowlStats } from './home'

export type { BowlStats }
export const BASIC_BOWL: BowlStats = { cap: 8, portion: 30 }
export const MAX_BOWL_CAP = 24
export const PORTION_COST = 5

/** The placed bowl's stats and name; a missing or unknown bowl counts as Basic. */
export const bowlOf = (home: Home): BowlStats & { name: string } => {
  const item = furniture(home.decor.bowl)
  return { ...(item?.bowl ?? BASIC_BOWL), name: item?.name ?? 'Basic bowl' }
}
/** How many portions the placed bowl holds. */
export const bowlCap = (home: Home) => bowlOf(home).cap
/** Shop and Home text for a bowl's cap and portion. */
export const bowlPerk = (stats: Pick<BowlStats, 'cap' | 'portion'>) => `cap ${stats.cap} · +${stats.portion} hunger`

/** A saved bowl, repaired: missing or bad data gives 3 portions, food is a whole number within the largest cap. */
export const normalizeBowl = (bowl: unknown): { food: number } => {
  if (!bowl || typeof bowl !== 'object' || !Number.isFinite((bowl as { food?: unknown }).food)) return { food: 3 }
  return { food: Math.max(0, Math.min(MAX_BOWL_CAP, Math.floor((bowl as { food: number }).food))) }
}

/** Buy up to n portions at 5c each, never past the placed bowl's cap. Overflow from a smaller bowl stays until eaten. */
export const fillBowl = (home: Home, n: number, now: number): Home => {
  const want = Math.floor(n)
  if (!Number.isFinite(want) || want <= 0) return { ...home, log: 'Usage: fill at least one portion.' }
  const room = bowlCap(home) - home.bowl.food
  if (room <= 0) return { ...home, log: 'The bowl is full.' }
  const portions = Math.min(want, room, Math.floor(home.coins / PORTION_COST))
  if (portions <= 0) return { ...home, log: 'Not enough coins for fish (5).' }
  const filled = { ...home, coins: home.coins - portions * PORTION_COST, bowl: { food: home.bowl.food + portions },
    effect: { kind: 'fish' as const, at: now },
    log: portions === 1 ? 'You add a portion to the bowl.' : `You add ${portions} portions to the bowl.` }
  return track(filled, 'feed', portions, now)
}
