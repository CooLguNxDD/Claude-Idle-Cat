import { defineMove } from '../types'

export default defineMove({ id: 'celebrate', label: 'Celebrate', pose: 'spin', cycle: 8, speed: 0, turn: 2, lift: [0,-2,-4,-6,-6,-4,-2,0], isScripted: true, seconds: [3, 4], when: { weight: 0 } })
