import { defineMove } from '../types'

export default defineMove({
  id: 'tunnel-dash', label: 'Tunnel dash', pose: 'run', cycle: 4, speed: 3,
  lift: [0, -1, -2, -1],
  seconds: [4, 6],
  when: { moods: ['happy', 'ok'], personality: { playful: 3, curious: 2 }, weight: 1.5 },
  next: ['sit', 'groom', 'zoomies'],
  seek: 'tunnel',
})
