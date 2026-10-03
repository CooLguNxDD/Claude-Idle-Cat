import { defineBreed } from '../types'

export default defineBreed({
  id: 'lynx', label: 'Lynx', rarity: 'epic',
  fur: { mix: ['overlay2', 'rosewater', 0.35] }, dark: { mix: ['overlay0', 'ink', 0.3] }, belly: 'light',
  pattern: { kind: 'stripes' },
})
