import type { Home } from '../types'
import { track } from './collection'
import { WORLDS } from './content'
import { LANDMARK_WIDTH, TIER_KEYS, isUnlocked, unlockHint } from './content/types'
import type { Cost, LandmarkKind, World } from './content/types'
import { canPay, costText, payCost } from './shop'

// The yard the household lives in; an unknown id (a removed world file) falls back to the first world.
export const worldOf = (home: Pick<Home, 'world'>): World => WORLDS.find(w => w.id === home.world?.id) ?? WORLDS[0]!

const tierKey = (tier: number) => TIER_KEYS[Math.max(0, Math.min(TIER_KEYS.length - 1, tier))]!

/** Yard width in scene columns at a house tier, never narrower than the pane. */
export const worldCols = (world: World, tier: number, paneCols: number) => Math.max(paneCols, world.width[tierKey(tier)])

export type Landmark = { kind: LandmarkKind; x: number; w: number }
/** The landmarks a house tier has unlocked, left to right. */
export const landmarksOf = (world: World, tier: number): Landmark[] => world.landmarks
  .filter(l => l.tier <= tier).map(l => ({ kind: l.kind, x: l.x, w: LANDMARK_WIDTH[l.kind] })).sort((a, b) => a.x - b.x)

const isFree = (cost?: Cost) => !cost || (!(cost.coins || cost.miles) && !Object.keys(cost.materials ?? {}).length)

/** Known ids only, plus every free world and the yard the save is standing in. */
export const normalizeWorlds = (saved: unknown, currentId: string | undefined): string[] => {
  const known = new Set(WORLDS.map(w => w.id))
  const out: string[] = []
  const add = (id: string) => { if (known.has(id) && !out.includes(id)) out.push(id) }
  if (Array.isArray(saved)) for (const id of saved) if (typeof id === 'string') add(id)
  for (const world of WORLDS) if (isFree(world.cost)) add(world.id)
  if (currentId) add(currentId)
  return out
}

export const isWorldOwned = (home: Home, id: string) => home.worlds.includes(id) || WORLDS.some(w => w.id === id && isFree(w.cost))

type BuyCheck = { ok: true; world: World } | { ok: false; reason: string }

export const canBuyWorld = (home: Home, id: string): BuyCheck => {
  const world = WORLDS.find(w => w.id === id)
  if (!world) return { ok: false, reason: `No world called ${id}.` }
  if (isWorldOwned(home, id)) return { ok: false, reason: `You already own the ${world.label}.` }
  if (!isUnlocked(home, world.unlock)) return { ok: false, reason: `Needs ${unlockHint(world.unlock)}.` }
  const cost = world.cost ?? {}
  if (!canPay(home, cost)) return { ok: false, reason: `Costs ${costText(cost)}.` }
  return { ok: true, world }
}

/** Pay, own and move in. A failed check leaves the save unchanged except the log. */
export const buyWorld = (home: Home, id: string, now: number): Home => {
  const check = canBuyWorld(home, id)
  if (!check.ok) return { ...home, log: check.reason }
  const cost = check.world.cost ?? {}
  const paid = payCost(home, cost)
  return track({ ...paid, worlds: [...paid.worlds, check.world.id], world: { id: check.world.id },
    effect: { kind: 'shop', at: now }, log: `The cats moved into the ${check.world.label} for ${costText(cost)}.` }, 'buy', 1, now)
}

/** Moves the household to an owned world. A locked yard says what it costs. */
export const setWorld = (home: Home, id: string): Home => {
  const world = WORLDS.find(w => w.id === id)
  if (!world) return { ...home, log: `No world called ${id}. Worlds: ${WORLDS.map(w => w.id).join(', ')}.` }
  if (!isWorldOwned(home, id)) return { ...home, log: `${world.label} costs ${costText(world.cost ?? {})}. /cat world buy ${id}` }
  return { ...home, world: { id: world.id }, log: `The cats moved to the ${world.label}.` }
}
