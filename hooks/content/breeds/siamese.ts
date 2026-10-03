import { defineBreed } from '../types'

export default defineBreed({
  id: 'siamese', label: 'Siamese', rarity: 'uncommon',
  fur: { mix: ['rosewater', 'yellow', 0.3] }, dark: { mix: ['overlay0', 'ink', 0.5] }, belly: 'rosewater',
  pattern: { kind: 'points' },
})
