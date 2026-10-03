import { defineBreed } from '../types'

export default defineBreed({
  id: 'ghost', label: 'Ghost', rarity: 'epic',
  fur: { mix: ['light', 'lavender', 0.25] }, dark: 'lavender', belly: 'light',
  pattern: { kind: 'undercoat', blend: 0.7 },
  available: { months: [10] },
})
