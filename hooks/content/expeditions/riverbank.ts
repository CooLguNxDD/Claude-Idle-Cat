import { defineExpedition } from '../types'

export default defineExpedition({
  id: 'riverbank', label: 'Riverbank', blurb: 'Fish dart between smooth shells and muddy paw prints.',
  minutes: 45, party: [1, 3], minLevel: 2, cost: { coins: 25, energy: 20 }, unlock: { item: 'harbor-map' },
  loot: { coins: [15, 40], materials: { shell: 6, feather: 2 }, rolls: [2, 3], critters: 0.4, critterKinds: ['fish'], },
  likes: { curious: 1.3, playful: 1.2 }, xp: 40, bond: 3,
})
