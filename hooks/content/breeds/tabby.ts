import { defineBreed } from '../types'

export default defineBreed({
  id: 'tabby', label: 'Tabby', rarity: 'common',
  fur: { mix: ['peach', 'overlay0', 0.55] }, dark: { mix: ['overlay0', 'ink', 0.4] }, belly: 'rosewater',
  pattern: { kind: 'stripes' },
})
