import { defineFurniture } from '../types'

export default defineFurniture({ id: 'feeder', name: 'Auto-feeder', slot: 'bowl', price: 60, perk: 'feeds hungry cats', bowl: { cap: 10, portion: 30 }, mods: { autoFeed: true }, bait: 2, likes: 'greedy' })
