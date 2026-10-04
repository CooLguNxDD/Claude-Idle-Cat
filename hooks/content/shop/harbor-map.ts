import { defineShop } from '../types'

export default defineShop({
  id: 'harbor-map', name: 'Harbor map', text: 'Unlocks Riverbank', shop: 'curio', kind: 'map', grants: 'harbor-map',
  cost: { coins: 80, materials: { feather: 3 } }, unlock: { tier: 0 },
})
