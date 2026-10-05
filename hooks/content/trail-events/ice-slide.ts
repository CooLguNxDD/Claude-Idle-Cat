import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'ice-slide', label: 'Ice slide', kind: 'obstacle', moves: ['tunnel-dash', 'stretch'], prop: 'ice',
  seconds: 6, weight: 2, trails: ['snow-trail'], line: '{cat} slides across the ice',
})
