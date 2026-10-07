import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'snowball-fight', label: 'Snowball fight', kind: 'fight', moves: ['pounce', 'zoomies'], prop: 'snowball',
  seconds: 8, weight: 2, trails: ['snow-trail'], line: 'Snowball fight!',
})
