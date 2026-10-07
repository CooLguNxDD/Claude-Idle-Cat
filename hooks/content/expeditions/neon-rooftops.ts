import { defineExpedition } from '../types'

export default defineExpedition({
  id: 'neon-rooftops', label: 'Neon Rooftops', blurb: 'Glowing signs light a skyline of daring rooftop jumps.',
  minutes: 120, party: [1, 3], minLevel: 5, cost: { coins: 70, energy: 35 }, unlock: { world: 'neon-alley' },
  loot: { coins: [40, 100], materials: { 'neon-scrap': 6, feather: 2 }, rolls: [3, 4], critters: 0.4, rare: { item: 'neon-sign', odds: 0.03 }, },
  likes: { curious: 1.3, playful: 1.2 }, xp: 40, bond: 3,
  flow: { events: ['stroll', 'pigeon-squabble', 'rooftop-gap', 'critter-scuffle', 'treasure-chest', 'stray-hello', 'head-home'], boss: 'rogue-drone', backdrop: 'neon' },
})
