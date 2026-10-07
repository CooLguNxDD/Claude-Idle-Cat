import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'mushroom-ring', label: 'Mushroom ring', kind: 'forage', moves: ['prowl', 'knead'], prop: 'mushroom',
  seconds: 8, weight: 2, trails: ['deep-woods'], line: '{cat} finds a mushroom ring',
})
