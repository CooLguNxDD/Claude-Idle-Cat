import { defineBreed } from '../types'

export default defineBreed({
  id: 'moon-smoke', label: 'Moon Smoke', rarity: 'rare',
  fur: { mix: ['overlay1', 'blue', 0.3] }, dark: 'sapphire', belly: 'light',
  pattern: { kind: 'undercoat', blend: 0.65 },
})
