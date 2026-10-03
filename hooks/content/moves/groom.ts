import { defineMove } from '../types'

export default defineMove({
  id: 'groom', label: 'Groom', pose: 'groom', cycle: 8, speed: 0,
  seconds: [3, 6],
  when: { personality: { shy: 2 }, weight: 2 },
  next: ['sit', 'loaf', 'walk'],
})
