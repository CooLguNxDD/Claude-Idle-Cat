import { defineShop } from '../types'

export default defineShop({
  id: 'lucky-collar', name: 'Lucky collar', text: '+5% rare odds', shop: 'curio', kind: 'gear', grants: 'lucky-collar',
  cost: { coins: 80, materials: { shell: 2 } }, unlock: { tier: 1 }, mods: { rareOdds: 0.05 },
})
