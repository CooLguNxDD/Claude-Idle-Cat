import { defineBreed } from '../types'

export default defineBreed({
  id: 'calico-void', label: 'Calico Void', rarity: 'rare',
  fur: 'ink', dark: 'mauve', belly: 'light',
  pattern: { kind: 'patches', colors: ['peach', 'mauve'] },
})
