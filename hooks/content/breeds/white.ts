import { defineBreed } from '../types'

export default defineBreed({
  id: 'white', label: 'White', rarity: 'common',
  fur: 'light', dark: { mix: ['light', 'overlay1', 0.3] }, belly: 'light',
  pattern: { kind: 'solid' },
})
