import { defineMove } from '../types'

export default defineMove({ id: 'reaction-nap', label: 'Command nap', pose: 'sleep', cycle: 24, speed: 0, isScripted: true, seconds: [10, 20], when: { weight: 0 } })
