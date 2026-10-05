import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'bee-buzz', label: 'Bee buzz', kind: 'obstacle', moves: ['prowl', 'zoomies'], prop: 'bee',
  seconds: 6, weight: 1.5, trails: ['garden-patrol'], line: '{cat} dodges a buzzing bee',
})
