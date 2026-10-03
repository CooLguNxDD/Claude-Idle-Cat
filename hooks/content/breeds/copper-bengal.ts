import { defineBreed } from '../types'

export default defineBreed({
  id: 'copper-bengal', label: 'Copper Bengal', rarity: 'epic',
  fur: { mix: ['peach', 'maroon', 0.3] }, dark: { mix: ['ink', 'maroon', 0.2] }, belly: 'rosewater',
  pattern: { kind: 'rosettes' },
})
