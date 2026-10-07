import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'log-leap', label: 'Log leap', kind: 'obstacle', moves: ['prowl', 'hop'], prop: 'log',
  seconds: 6, weight: 1.5, line: '{cat} leaps a fallen log',
})
