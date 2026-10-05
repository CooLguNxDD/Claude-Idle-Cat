import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'stroll', label: 'Stroll', kind: 'walk', moves: ['trot'],
  seconds: 6, weight: 4, line: '{cat} trots down the trail',
})
