import { defineBreed } from '../types'

export default defineBreed({
  id: 'russian-blue', label: 'Russian Blue', rarity: 'rare',
  fur: { mix: ['overlay1', 'blue', 0.3] }, dark: { mix: ['overlay0', 'blue', 0.35] }, belly: { mix: ['overlay2', 'lavender', 0.3] },
  pattern: { kind: 'solid' },
})
