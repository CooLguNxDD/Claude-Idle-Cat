import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'rooftop-gap', label: 'Rooftop gap', kind: 'obstacle', moves: ['prowl', 'hop'], prop: 'gap',
  seconds: 6, weight: 2, trails: ['neon-rooftops'], line: '{cat} jumps a rooftop gap',
})
