import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'stray-hello', label: 'Stray hello', kind: 'meet', moves: ['sit', 'hop'], prop: 'stray',
  seconds: 8, weight: 1, line: 'A stray waves hello',
})
