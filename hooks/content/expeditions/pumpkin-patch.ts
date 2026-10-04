import { defineExpedition } from '../types'

export default defineExpedition({
  id: 'pumpkin-patch', label: 'Pumpkin Patch', blurb: 'Rows of gourds and suspicious crows.',
  minutes: 90, party: [1, 3], minLevel: 3, cost: { coins: 40, energy: 30 },  available: { months: [10] },
  loot: { coins: [30, 80], materials: { pumpkin: 6, 'pine-cone': 3 }, rolls: [2, 4], critters: 0.4, rare: { item: 'jackolantern', odds: 0.05 }, },
  likes: { curious: 1.3, playful: 1.2 }, xp: 40, bond: 3,
})
