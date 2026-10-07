import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'crow-caw', label: 'Crow caw', kind: 'fight', moves: ['hiss', 'pounce'], prop: 'crow',
  seconds: 8, weight: 2, trails: ['pumpkin-patch'], line: 'Crows caw! {cat} shoos them',
})
