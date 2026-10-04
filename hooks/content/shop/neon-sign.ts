import { defineShop } from '../types'

export default defineShop({
  id: 'neon-sign', name: 'Neon sign', text: 'double AFK events', shop: 'curio', kind: 'furniture', grants: 'neon-sign', cost: { coins: 3000, materials: { 'neon-scrap': 15 } }, unlock: { tier: 4 },
})
