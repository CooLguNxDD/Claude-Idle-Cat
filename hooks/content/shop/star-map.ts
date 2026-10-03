import { defineShop } from '../types'

export default defineShop({
  id: 'star-map', name: 'Star map', text: 'Unlocks Moon Crater', shop: 'curio', kind: 'map', grants: 'star-map',
  cost: { coins: 500, materials: { 'neon-scrap': 5 } }, unlock: { tier: 5 },
})
