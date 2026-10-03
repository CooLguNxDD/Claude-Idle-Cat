import { defineMove } from '../types'

export default defineMove({
  id: 'prowl', label: 'Prowl', pose: 'crouch', cycle: 8, speed: 0.5,
  lift: [0, 0, 1, 1, 0, 0, 1, 1],
  seconds: [3, 6],
  when: { moods: ['ok', 'happy'], personality: { curious: 2.5, shy: 1.5 }, hours: [18, 6], weight: 1.5 },
  next: ['pounce', 'sit'],
})
