import type { Cat } from '../types'
import { REACTIONS } from './content'
import type { Reaction, Signal } from './content/types'
import type { Rng } from './rng'

export type ReactionMemory = Record<string, number>
export type ReactionMode = 'on' | 'quiet' | 'off'
export const pickReaction = (cat: Cat, signals: readonly Signal[], tool: string, now: number, memory: ReactionMemory, rng: Rng, mode: ReactionMode = 'on'): Reaction | null => {
  if (mode === 'off') return null
  for (const on of signals) for (const r of REACTIONS) {
    if (r.on !== on || (r.tools && !r.tools.includes(tool)) || (r.personality && !r.personality.includes(cat.genes.personality))) continue
    if (now - (memory[`${cat.id}:${r.id}`] ?? -Infinity) < r.cooldownSec * 1000) continue
    if (rng() < r.odds) return r
  }
  return null
}
export const rememberReaction = (m: ReactionMemory, catId: string, id: string, now: number): ReactionMemory => ({ ...m, [`${catId}:${id}`]: now })
