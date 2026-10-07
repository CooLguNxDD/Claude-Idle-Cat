import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'critter-scuffle', label: 'Critter scuffle', kind: 'fight', moves: ['hiss', 'pounce'], prop: 'rat',
  seconds: 8, weight: 2, line: '{cat} bops a cheeky rat!',
})
