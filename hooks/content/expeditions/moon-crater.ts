import { defineExpedition } from '../types'

export default defineExpedition({
  id: 'moon-crater', label: 'Moon Crater', blurb: 'Gather stardust beneath a sky of silent shooting stars.',
  minutes: 240, party: [1, 3], minLevel: 15, cost: { coins: 120, energy: 40 }, unlock: { tier: 5, item: 'star-map' },
  loot: { coins: [60, 160], materials: { stardust: 6, 'neon-scrap': 2 }, rolls: [3, 5], critters: 0.4, rare: { item: 'moon-hammock', odds: 0.03 }, },
  likes: { curious: 1.3, playful: 1.2 }, xp: 40, bond: 3,
  flow: { events: ['stroll', 'meteor-dodge', 'little-alien', 'forage', 'treasure-chest', 'curious-sign', 'head-home'], backdrop: 'moon' },
})
