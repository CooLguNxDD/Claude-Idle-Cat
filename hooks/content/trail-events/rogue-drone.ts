import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'rogue-drone', label: 'Rogue drone', kind: 'boss', moves: ['hiss', 'zoomies', 'celebrate'], prop: 'drone',
  seconds: 14, weight: 1, trails: ['neon-rooftops'], line: 'A rogue drone! {cat} swats',
})
