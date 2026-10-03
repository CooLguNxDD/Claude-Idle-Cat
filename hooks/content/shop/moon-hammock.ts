import { defineShop } from '../types'

export default defineShop({
  id: 'moon-hammock', name: 'Moon hammock', text: '+150% regen, +25% bonds', shop: 'curio', kind: 'furniture', grants: 'moon-hammock', cost: { coins: 6000, materials: { stardust: 20 } }, unlock: { tier: 5 },
})
