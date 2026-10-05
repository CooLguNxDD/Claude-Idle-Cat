import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'curious-sign', label: 'Curious sign', kind: 'discover', moves: ['sit', 'groom'], prop: 'signpost',
  seconds: 8, weight: 1, line: '{cat} sniffs an old sign',
})
