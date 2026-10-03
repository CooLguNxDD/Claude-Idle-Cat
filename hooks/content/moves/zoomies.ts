import { defineMove } from '../types'

export default defineMove({
  id: 'zoomies', label: 'Zoomies', pose: 'run', cycle: 4, speed: 4,
  lift: [0, -1, -2, -1],
  seconds: [2, 4],
  when: { moods: ['happy'], personality: { playful: 3 }, hours: [6, 23], weight: 1 },
  next: ['sit', 'groom', 'loaf'],
})
