import { defineShop } from '../types'

export default defineShop({
  id: 'expedition-permit', name: 'Expedition permit', text: '+1 expedition slot (max four)', shop: 'curio', kind: 'charm', grants: 'expedition-permit',
  cost: { coins: 1000, materials: { 'pine-cone': 10 } }, unlock: { tier: 3 },
})
