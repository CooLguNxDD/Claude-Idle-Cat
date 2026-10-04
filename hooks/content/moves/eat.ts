import { defineMove } from '../types'

export default defineMove({
  id: 'eat', label: 'Eat', pose: 'crouch', cycle: 8, speed: 0, isScripted: true, goTo: 'bowl',
  seconds: [3, 6], when: { weight: 0 },
})
