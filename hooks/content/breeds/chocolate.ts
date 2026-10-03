import { defineBreed } from '../types'

export default defineBreed({
  id: 'chocolate', label: 'Chocolate', rarity: 'uncommon',
  fur: { mix: ['peach', 'ink', 0.58] }, dark: { mix: ['maroon', 'ink', 0.75] }, belly: { mix: ['rosewater', 'peach', 0.5] },
  pattern: { kind: 'solid' },
})
