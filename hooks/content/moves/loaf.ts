import { defineMove } from '../types'

export default defineMove({
  id: 'loaf', label: 'Loaf', pose: 'loaf', cycle: 24, speed: 0,
  seconds: [6, 16],
  when: { moods: ['ok', 'grumpy', 'happy'], personality: { lazy: 3, cuddly: 2 }, weight: 2 },
})
