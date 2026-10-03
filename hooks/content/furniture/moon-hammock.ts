import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'moon-hammock', name: 'Moon hammock', slot: 'bed', price: 0, minTier: 5, cost: { coins: 6000, materials: { stardust: 20 } },
  perk: '+150% regen, +25% bonds', mods: { regen: 2.5, bond: 1.25 }, bait: 5, art: { rows: ['p......p', 'p.mmmm.p', '.pmmmm.p', '..pppp..'], colors: { p: 'yellow', m: 'mauve' } },
})
