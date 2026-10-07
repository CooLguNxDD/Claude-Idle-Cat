import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'pigeon-squabble', label: 'Pigeon squabble', kind: 'fight', moves: ['hiss', 'pounce'], prop: 'pigeon',
  seconds: 8, weight: 2, trails: ['neon-rooftops'], line: 'Pigeons squabble with {cat}',
})
