import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'cardboard-pipeline', name: 'Cardboard pipeline', slot: 'hanging', price: 0, cost: { coins: 600, materials: { 'neon-scrap': 2 } },
  perk: '+30% AFK events, +10% bonds', mods: { eventRate: 1.3, bond: 1.1 }, bait: 4, likes: 'curious',
  art: { rows: ['pppppppppppp', 'p.d..d..d..p', 'pppppppppppp', '..........pp', '..........pp'], colors: { p: 'peach', d: 'maroon' } },
})
