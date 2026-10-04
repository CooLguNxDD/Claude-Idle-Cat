import { defineShop } from '../types'

export default defineShop({
  id: 'celestial-bowl', name: 'Celestial bowl', text: 'cap 20 · +50 hunger, auto-feed, +80% gifts', shop: 'curio', kind: 'furniture', grants: 'celestial-bowl', cost: { coins: 9000, materials: { stardust: 25 } }, unlock: { tier: 5 },
})
