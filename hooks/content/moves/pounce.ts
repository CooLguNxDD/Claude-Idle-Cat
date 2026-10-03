import { defineMove } from '../types'

export default defineMove({
  id: 'pounce', label: 'Pounce', pose: 'crouch', cycle: 12, speed: 0.75,
  lift: [0, 0, 0, 0, 0, 0, 1, -3, -6, -7, -5, -2],
  seconds: [2, 3],
  when: { moods: ['happy', 'ok'], personality: { playful: 2, curious: 1.5 }, weight: 1 },
  next: ['sit', 'groom'],
})
