import { defineBreed } from '../types'

export default defineBreed({
  id: 'ragdoll', label: 'Ragdoll', rarity: 'rare',
  fur: 'light', dark: { mix: ['blue', 'overlay1', 0.65] }, belly: 'rosewater',
  pattern: { kind: 'points' },
})
