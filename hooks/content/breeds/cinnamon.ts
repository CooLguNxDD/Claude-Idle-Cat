import { defineBreed } from '../types'

export default defineBreed({
  id: 'cinnamon', label: 'Cinnamon', rarity: 'uncommon',
  fur: { mix: ['peach', 'red', 0.3] }, dark: { mix: ['peach', 'maroon', 0.7] }, belly: 'yellow',
  pattern: { kind: 'solid' },
})
