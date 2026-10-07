import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'little-alien', label: 'Little alien', kind: 'meet', moves: ['sit', 'hop'], prop: 'alien',
  seconds: 8, weight: 2, trails: ['moon-crater'], line: 'A little alien says hi',
})
