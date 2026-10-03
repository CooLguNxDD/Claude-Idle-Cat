import { defineMove } from '../types'

export default defineMove({ id: 'sneak-attack', label: 'Sneak attack', pose: 'crouch', cycle: 8, speed: 0.5, seconds: [3, 5], next: ['pounce'], when: { moods: ['happy', 'ok'], weight: 1 } })
