import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'forage', label: 'Forage', kind: 'forage', moves: ['prowl', 'knead'], prop: 'bush',
  seconds: 8, weight: 3, line: '{cat} digs under a bush',
})
