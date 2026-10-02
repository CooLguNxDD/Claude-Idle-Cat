import type { Cat } from '../types'

// Multipliers a cat's traits apply to the rules; skills join these in the skill-tree phase.
export type Mods = {
  coin: number
  energyDecay: number
  playJoy: number
  petJoy: number
  eventRate: number
  gift: number
}

const BASE: Mods = { coin: 1, energyDecay: 1, playJoy: 1, petJoy: 1, eventRate: 1, gift: 1 }

export const modsOf = (cat: Cat): Mods => {
  const m = { ...BASE }
  switch (cat.genes.personality) {
    case 'lazy': m.energyDecay = 0.5; break
    case 'playful': m.playJoy = 1.5; break
    case 'greedy': m.coin = 1.2; break
    case 'shy': m.gift = 1.5; break
    case 'cuddly': m.petJoy = 2; break
    case 'curious': m.eventRate = 1.5; break
  }
  return m
}
