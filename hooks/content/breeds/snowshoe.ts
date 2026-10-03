import { defineBreed } from '../types'

export default defineBreed({
  id: 'snowshoe', label: 'Snowshoe', rarity: 'uncommon',
  fur: { mix: ['rosewater', 'yellow', 0.2] }, dark: { mix: ['ink', 'surface1', 0.25] }, belly: 'light',
  pattern: { kind: 'points' },
})
