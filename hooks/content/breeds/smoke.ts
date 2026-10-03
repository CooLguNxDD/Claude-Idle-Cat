import { defineBreed } from '../types'

export default defineBreed({
  id: 'smoke', label: 'Smoke', rarity: 'rare',
  fur: { mix: ['ink', 'overlay0', 0.5] }, dark: 'ink', belly: 'overlay2',
  pattern: { kind: 'undercoat', blend: 0.45 },
})
