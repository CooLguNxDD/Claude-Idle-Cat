import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'treasure-chest', label: 'Treasure chest', kind: 'treasure', moves: ['sneak-attack', 'celebrate'], prop: 'chest',
  seconds: 10, weight: 2, line: '{cat} pops open a chest!',
})
