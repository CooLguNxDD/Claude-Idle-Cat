import { defineBreed } from '../types'

export default defineBreed({
  id: 'blue-cream', label: 'Blue Cream', rarity: 'uncommon',
  fur: 'light', dark: 'blue', belly: 'rosewater',
  pattern: { kind: 'patches', colors: ['blue', { mix: ['rosewater', 'yellow', 0.25] }] },
})
