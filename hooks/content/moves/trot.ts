import { defineMove } from '../types'

export default defineMove({
  id: 'trot', label: 'Trot', pose: 'walk', cycle: 6, speed: 1.75,
  seconds: [2, 5],
  when: { moods: ['ok', 'happy'], personality: { playful: 1.5, curious: 1.5 }, weight: 2 },
})
