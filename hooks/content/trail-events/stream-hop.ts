import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'stream-hop', label: 'Stream hop', kind: 'obstacle', moves: ['prowl', 'hop'], prop: 'stream',
  seconds: 6, weight: 2, trails: ['riverbank'], line: '{cat} hops the stream',
})
