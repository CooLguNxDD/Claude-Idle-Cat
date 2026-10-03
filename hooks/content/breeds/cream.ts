import { defineBreed } from '../types'

export default defineBreed({
  id: 'cream', label: 'Cream', rarity: 'common',
  fur: { mix: ['yellow', 'rosewater', 0.55] }, dark: { mix: ['yellow', 'peach', 0.5] }, belly: 'rosewater',
  pattern: { kind: 'solid' },
})
