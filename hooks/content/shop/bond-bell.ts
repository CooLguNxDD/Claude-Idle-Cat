import { defineShop } from '../types'

export default defineShop({
  id: 'bond-bell', name: 'Bond bell', text: '+25% bonds', shop: 'curio', kind: 'charm', grants: 'bond-bell',
  cost: { coins: 800, materials: { shell: 8 } }, unlock: { tier: 3 },
})
