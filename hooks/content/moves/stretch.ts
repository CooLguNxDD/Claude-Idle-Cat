import { defineMove } from '../types'

export default defineMove({
  id: 'stretch', label: 'Stretch', pose: 'stretch', cycle: 16, speed: 0,
  seconds: [2, 3],
  when: { hours: [5, 11], weight: 1.5 },
  next: ['walk', 'trot', 'sit'],
})
