import { defineBreed } from '../types'

export default defineBreed({
  id: 'black', label: 'Black', rarity: 'common',
  fur: { mix: ['ink', 'surface1', 0.35] }, dark: 'ink', belly: { mix: ['ink', 'surface2', 0.5] },
  pattern: { kind: 'solid' },
})
