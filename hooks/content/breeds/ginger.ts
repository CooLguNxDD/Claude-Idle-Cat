import { defineBreed } from '../types'

export default defineBreed({
  id: 'ginger', label: 'Ginger', rarity: 'common',
  fur: 'peach', dark: { mix: ['peach', 'maroon', 0.5] }, belly: 'rosewater',
  pattern: { kind: 'stripes' },
})
