import { defineShop } from '../types'

export default defineShop({
  id: 'shell-fountain', name: 'Seashell fountain', text: 'auto-feed, +60% gifts', shop: 'curio', kind: 'furniture', grants: 'shell-fountain', cost: { coins: 1500, materials: { shell: 12 } }, unlock: { tier: 3 },
})
