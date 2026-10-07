import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'head-home', label: 'Head home', kind: 'return', moves: ['trot'], prop: 'sack',
  seconds: 6, weight: 1, line: 'Heading home with the loot!',
})
