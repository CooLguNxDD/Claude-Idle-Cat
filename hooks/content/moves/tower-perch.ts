import { defineMove } from '../types'

export default defineMove({
  id: 'tower-perch', label: 'Tower perch', pose: 'loaf', cycle: 24, speed: 1.5,
  seconds: [8, 20],
  when: { moods: ['ok', 'happy', 'grumpy'], personality: { lazy: 2, curious: 2, shy: 1.5 }, weight: 2 },
  next: ['hop', 'sit', 'groom'],
  seek: 'tower',
})
