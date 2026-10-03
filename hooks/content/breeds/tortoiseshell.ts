import { defineBreed } from '../types'

export default defineBreed({
  id: 'tortoiseshell', label: 'Tortoiseshell', rarity: 'rare',
  fur: { mix: ['ink', 'surface1', 0.4] }, dark: 'peach', belly: { mix: ['peach', 'maroon', 0.5] },
  pattern: { kind: 'patches', colors: ['peach', { mix: ['ink', 'surface1', 0.4] }] },
})
