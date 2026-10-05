import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'owl-stare', label: 'Owl stare', kind: 'fight', moves: ['hiss', 'sneak-attack'], prop: 'owl',
  seconds: 10, weight: 2, trails: ['deep-woods'], line: 'An owl stares down {cat}',
})
