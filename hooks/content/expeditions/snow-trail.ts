import { defineExpedition } from '../types'

export default defineExpedition({
  id: 'snow-trail', label: 'Snow Trail', blurb: 'Fresh paw prints sparkle through the winter drifts.',
  minutes: 60, party: [1, 3], minLevel: 3, cost: { coins: 35, energy: 25 },  available: { months: [12, 1, 2] },
  loot: { coins: [20, 60], materials: { snowflake: 6, 'pine-cone': 2 }, rolls: [2, 4], critters: 0.4, },
  likes: { curious: 1.3, playful: 1.2 }, xp: 40, bond: 3,
})
