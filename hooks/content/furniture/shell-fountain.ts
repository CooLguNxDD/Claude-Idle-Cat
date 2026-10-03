import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'shell-fountain', name: 'Seashell fountain', slot: 'bowl', price: 0, minTier: 3, cost: { coins: 1500, materials: { shell: 12 } },
  perk: 'auto-feed, +60% gifts', mods: { autoFeed: true, gift: 1.6 }, bait: 5, art: { rows: ['...s....', '..sbs...', '.ssbss..', 'ssssssss'], colors: { s: 'rosewater', b: 'sky' } },
})
