import { defineBreed } from '../types'

export default defineBreed({
  id: 'silver', label: 'Silver', rarity: 'rare',
  fur: { mix: ['light', 'lavender', 0.35] }, dark: 'overlay1', belly: 'light',
  pattern: { kind: 'stripes' },
})
