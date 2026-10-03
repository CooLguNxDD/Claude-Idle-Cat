import { defineShop } from '../types'

export default defineShop({
  id: 'big-satchel', name: 'Big satchel', text: '+1 material roll', shop: 'curio', kind: 'gear', grants: 'big-satchel',
  cost: { coins: 60, materials: { feather: 3 } }, unlock: { tier: 1 }, mods: { matRolls: 1 },
})
