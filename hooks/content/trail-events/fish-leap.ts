import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'fish-leap', label: 'Fish leap', kind: 'forage', moves: ['window-watch', 'pounce'], prop: 'fish',
  seconds: 8, weight: 2, trails: ['riverbank'], line: '{cat} swipes a leaping fish',
})
