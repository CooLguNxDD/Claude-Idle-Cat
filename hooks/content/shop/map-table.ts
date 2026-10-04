import { defineShop } from '../types'

export default defineShop({
  id: 'map-table', name: 'Expedition map table', text: '10% shorter expeditions', shop: 'curio', kind: 'furniture', grants: 'map-table', cost: { coins: 1200, materials: { 'pine-cone': 10 } }, unlock: { tier: 3 },
})
