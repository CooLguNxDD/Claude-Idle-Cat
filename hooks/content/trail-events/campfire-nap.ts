import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'campfire-nap', label: 'Campfire nap', kind: 'rest', moves: ['loaf', 'nap-curl'], prop: 'campfire',
  seconds: 12, weight: 1.5, line: 'Party naps by the fire',
})
