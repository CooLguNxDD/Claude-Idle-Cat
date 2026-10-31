import { defineShop } from '../types'

export default defineShop({
  id: 'cardboard-tower', name: 'Cardboard cat tower', text: '+30% coins, built from boxes', shop: 'curio', kind: 'furniture', grants: 'cardboard-tower', cost: { coins: 300, materials: { 'pine-cone': 3 } },
})
