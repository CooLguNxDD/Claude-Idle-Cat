import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'ceramic-bowl', name: 'Ceramic bowl', slot: 'bowl', price: 0, cost: { coins: 150 },
  perk: 'cap 10 · +35 hunger', bowl: { cap: 10, portion: 35 }, mods: {}, bait: 2, likes: 'greedy',
  art: { rows: ['..pppp..', '.pwwwwp.', '.pwwwwp.', '..pppp..'], colors: { p: 'peach', w: 'text' } },
})
