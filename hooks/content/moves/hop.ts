import { defineMove } from '../types'

export default defineMove({
  id: 'hop', label: 'Hop', pose: 'sit', cycle: 8, speed: 0,
  lift: [0, 0, -2, -5, -6, -5, -2, 0],
  seconds: [1, 2],
  when: { moods: ['happy'], personality: { playful: 2 }, weight: 1 },
  next: ['sit', 'walk', 'trot'],
})
