import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'meteor-dodge', label: 'Meteor dodge', kind: 'obstacle', moves: ['tunnel-dash', 'sit'], prop: 'meteor',
  seconds: 6, weight: 2, trails: ['moon-crater'], line: '{cat} dodges a meteor',
})
