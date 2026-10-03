import { defineMove } from '../types'

export default defineMove({
  id: 'pipe-lounge', label: 'Pipe lounge', pose: 'loaf', cycle: 24, speed: 1.5,
  seconds: [10, 24],
  when: { moods: ['ok', 'happy'], personality: { lazy: 3, cuddly: 1.5 }, hours: [10, 18], weight: 1.5 },
  next: ['stretch', 'sit'],
  seek: 'pipe',
})
