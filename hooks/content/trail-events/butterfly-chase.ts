import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'butterfly-chase', label: 'Butterfly chase', kind: 'discover', moves: ['pounce', 'chase-tail'], prop: 'butterfly',
  seconds: 8, weight: 2, trails: ['garden-patrol'], line: '{cat} chases a butterfly',
})
