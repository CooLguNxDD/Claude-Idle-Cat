import type { Cat } from '../types'
import { skillTotals } from './skills'
import type { SkillTotals } from './skills'

// Multipliers the rules read: personality traits times learned skills.
export type Mods = SkillTotals

const TRAITS: Record<Cat['genes']['personality'], Partial<Mods>> = {
  lazy: { energyDecay: 0.5 },
  playful: { playJoy: 1.5 },
  greedy: { coin: 1.2 },
  shy: { gift: 1.5 },
  cuddly: { petJoy: 2 },
  curious: { eventRate: 1.5 },
}

export const modsOf = (cat: Cat): Mods => {
  const m = skillTotals(cat)
  for (const [key, value] of Object.entries(TRAITS[cat.genes.personality]) as [keyof Mods, number][]) {
    m[key] *= value
  }
  return m
}
