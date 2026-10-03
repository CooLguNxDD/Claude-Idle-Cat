import { defineShop } from '../types'

export default defineShop({
  id: 'catnip-tea', name: 'Catnip tea', text: 'Refills a returning cat’s energy', shop: 'curio', kind: 'consumable', grants: 'catnip-tea',
  cost: { coins: 20, materials: { feather: 1 } }, unlock: { tier: 0 },
})
