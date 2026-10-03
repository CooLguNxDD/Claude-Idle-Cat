import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'map-table', name: 'Expedition map table', slot: 'toy', price: 0, minTier: 3, cost: { coins: 1200, materials: { 'pine-cone': 10 } },
  perk: '10% shorter expeditions', mods: { expTime: 0.9 }, bait: 5, art: { rows: ['pppppppp', 'pggppggp', 'pppppppp', '.p....p.'], colors: { p: 'peach', g: 'green' } },
})
