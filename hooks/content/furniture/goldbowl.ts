import { defineFurniture } from '../types'

export default defineFurniture({ id: 'goldbowl', name: 'Golden bowl', slot: 'bowl', price: 0, miles: 800, perk: 'auto-feeds, +50% gifts', bowl: { cap: 14, portion: 40, joy: 5, xp: 1 }, mods: { autoFeed: true, gift: 1.5 }, bait: 5, likes: 'greedy' })
