import { defineBreed } from '../types'

export default defineBreed({
  id: 'calico', label: 'Calico', rarity: 'uncommon',
  fur: 'light', dark: 'peach', belly: 'light',
  pattern: { kind: 'patches', colors: ['peach', { mix: ['ink', 'surface1', 0.4] }] },
})
