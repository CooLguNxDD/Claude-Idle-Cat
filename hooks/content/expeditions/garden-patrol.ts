import { defineExpedition } from '../types'

export default defineExpedition({
  id: 'garden-patrol', label: 'Garden Patrol', blurb: 'Follow fluttering feathers along the garden fence.',
  minutes: 15, party: [1, 3], minLevel: 1, cost: { coins: 10, energy: 10 },
  loot: { coins: [5, 15], materials: { feather: 6, 'pine-cone': 3 }, rolls: [1, 2], critters: 0.4, },
  likes: { curious: 1.3, playful: 1.2 }, xp: 40, bond: 3,
  flow: { events: ['stroll', 'forage', 'butterfly-chase', 'bee-buzz', 'treasure-chest', 'stray-hello', 'head-home'], backdrop: 'garden' },
})
