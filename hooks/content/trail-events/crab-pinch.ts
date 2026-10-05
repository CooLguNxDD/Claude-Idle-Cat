import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'crab-pinch', label: 'Crab pinch', kind: 'fight', moves: ['hiss', 'pounce'], prop: 'crab',
  seconds: 8, weight: 2, trails: ['riverbank'], line: 'A crab pinches! {cat} bops it',
})
