import { defineBreed } from '../types'

export default defineBreed({
  id: 'bengal', label: 'Bengal', rarity: 'epic',
  fur: { mix: ['yellow', 'peach', 0.55] }, dark: { mix: ['maroon', 'ink', 0.65] }, belly: 'rosewater',
  pattern: { kind: 'rosettes' },
})
