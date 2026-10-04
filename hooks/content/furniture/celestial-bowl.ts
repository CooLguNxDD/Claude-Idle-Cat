import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'celestial-bowl', name: 'Celestial bowl', slot: 'bowl', price: 0, minTier: 5, cost: { coins: 9000, materials: { stardust: 25 } },
  perk: 'cap 20 · +50 hunger', bowl: { cap: 20, portion: 50, joy: 10, energy: 5, xp: 3 }, mods: { autoFeed: true, gift: 1.8 }, bait: 6, likes: 'greedy',
  art: { rows: ['..y..y..', '.yssssy.', '.sbbbb.s', 'ssssssss'], colors: { y: 'yellow', s: 'lavender', b: 'sky' } },
})
