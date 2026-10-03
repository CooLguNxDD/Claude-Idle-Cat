import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'starlit-rug', name: 'Starlit rug', slot: 'rug', price: 0, minTier: 6, cost: { coins: 12000, materials: { stardust: 30 } },
  perk: 'joy fades 50% slower', mods: { joyDecay: 0.5 }, bait: 5, art: { rows: ['mmmmymmmmymmmm', 'mymmmmymmmmymm'], colors: { m: 'mauve', y: 'yellow' } },
})
