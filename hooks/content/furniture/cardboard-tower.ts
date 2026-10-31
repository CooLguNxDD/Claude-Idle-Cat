import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'cardboard-tower', name: 'Cardboard cat tower', slot: 'toy', price: 0, cost: { coins: 300, materials: { 'pine-cone': 3 } },
  perk: '+30% coins, built from boxes', mods: { coin: 1.3 }, bait: 3, likes: 'curious',
  art: { rows: ['..pppp..', '..pddp..', 'pppppppp', 'pd....dp', 'pppppppp', '.pd..dp.', '.pppppp.'], colors: { p: 'peach', d: 'maroon' } },
})
