import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'jack-chest', label: 'Jack chest', kind: 'treasure', moves: ['sneak-attack', 'celebrate'], prop: 'pumpkin',
  seconds: 10, weight: 2, trails: ['pumpkin-patch'], line: '{cat} peeks in a pumpkin',
})
