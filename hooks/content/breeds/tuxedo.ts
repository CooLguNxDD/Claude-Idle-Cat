import { defineBreed } from '../types'

export default defineBreed({
  id: 'tuxedo', label: 'Tuxedo', rarity: 'uncommon',
  fur: { mix: ['ink', 'surface1', 0.35] }, dark: 'ink', belly: 'light',
  pattern: { kind: 'bib' },
})
