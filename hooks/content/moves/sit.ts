import { defineMove } from '../types'

export default defineMove({
  id: 'sit', label: 'Sit', pose: 'sit', cycle: 16, speed: 0,
  seconds: [3, 8],
  when: { weight: 4 },
})
