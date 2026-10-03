import { defineExpedition } from '../types'

export default defineExpedition({
  id: 'deep-woods', label: 'Deep Woods', blurb: 'Pine cones mark a winding trail beneath the trees.',
  minutes: 90, party: [1, 3], minLevel: 3, cost: { coins: 40, energy: 30 }, unlock: { tier: 1 },
  loot: { coins: [30, 80], materials: { 'pine-cone': 6, feather: 2 }, rolls: [2, 4], critters: 0.4, rare: { item: 'tree', odds: 0.03 }, },
  likes: { curious: 1.3, playful: 1.2 }, xp: 40, bond: 3,
})
