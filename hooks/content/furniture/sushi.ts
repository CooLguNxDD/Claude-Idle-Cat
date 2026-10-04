import { defineFurniture } from '../types'

export default defineFurniture({ id: 'sushi', name: 'Sushi bar', slot: 'bowl', price: 320, perk: 'auto-feeds, +30% gifts', bowl: { cap: 12, portion: 35, joy: 5 }, mods: { autoFeed: true, gift: 1.3 }, bait: 4, likes: 'greedy' })
