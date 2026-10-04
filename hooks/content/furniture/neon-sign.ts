import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'neon-sign', name: 'Neon sign', slot: 'hanging', price: 0, minTier: 4, cost: { coins: 3000, materials: { 'neon-scrap': 15 } },
  perk: 'double AFK events', mods: { eventRate: 2 }, bait: 5, art: { rows: ['mmmmmmmm', 'msmsmsmm', 'mmmmmmmm'], colors: { m: 'pink', s: 'sky' } },
})
