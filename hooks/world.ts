import type { Home } from '../types'
import { WORLDS } from './content'
import { LANDMARK_WIDTH, TIER_KEYS } from './content/types'
import type { LandmarkKind, World } from './content/types'

// The yard the household lives in; an unknown id (a removed world file) falls back to the first world.
export const worldOf = (home: Pick<Home, 'world'>): World => WORLDS.find(w => w.id === home.world?.id) ?? WORLDS[0]!

const tierKey = (tier: number) => TIER_KEYS[Math.max(0, Math.min(TIER_KEYS.length - 1, tier))]!

/** Yard width in scene columns at a house tier, never narrower than the pane. */
export const worldCols = (world: World, tier: number, paneCols: number) => Math.max(paneCols, world.width[tierKey(tier)])

export type Landmark = { kind: LandmarkKind; x: number; w: number }
/** The landmarks a house tier has unlocked, left to right. */
export const landmarksOf = (world: World, tier: number): Landmark[] => world.landmarks
  .filter(l => l.tier <= tier).map(l => ({ kind: l.kind, x: l.x, w: LANDMARK_WIDTH[l.kind] })).sort((a, b) => a.x - b.x)

/** Moves the household to another world file by id; the log says what happened. */
export const setWorld = (home: Home, id: string): Home => {
  const world = WORLDS.find(w => w.id === id)
  if (!world) return { ...home, log: `No world called ${id}. Worlds: ${WORLDS.map(w => w.id).join(', ')}.` }
  return { ...home, world: { id: world.id }, log: `The cats moved to the ${world.label}.` }
}
