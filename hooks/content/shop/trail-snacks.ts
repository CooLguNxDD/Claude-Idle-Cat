import { defineShop } from '../types'

export default defineShop({
  id: 'trail-snacks', name: 'Trail snacks', text: '20% shorter trip', shop: 'curio', kind: 'gear', grants: 'trail-snacks',
  cost: { coins: 40, materials: { 'pine-cone': 2 } }, unlock: { tier: 0 }, mods: { expTime: 0.8 },
})
