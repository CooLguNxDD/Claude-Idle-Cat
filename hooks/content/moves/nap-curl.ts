import { defineMove } from '../types'

export default defineMove({
  id: 'nap-curl', label: 'Nap', pose: 'sleep', cycle: 24, speed: 0,
  seconds: [20, 60],
  when: { moods: ['sleeping'], weight: 1 },
})
