import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'big-raccoon', label: 'Big raccoon', kind: 'boss', moves: ['hiss', 'zoomies', 'celebrate'], prop: 'raccoon',
  seconds: 14, weight: 1, line: 'Boss raccoon! {cat} charges!',
})
