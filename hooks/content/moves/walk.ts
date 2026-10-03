import { defineMove } from '../types'

export default defineMove({
  id: 'walk', label: 'Walk', pose: 'walk', cycle: 8, speed: 1,
  seconds: [3, 8],
  when: { moods: ['ok', 'happy', 'grumpy'], personality: { curious: 2 }, weight: 4 },
})
