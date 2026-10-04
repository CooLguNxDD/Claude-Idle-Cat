import { defineMove } from '../types'

export default defineMove({ id: 'chase-tail', label: 'Chase tail', pose: 'spin', cycle: 16, speed: 0, turn: 4, seconds: [4, 8], when: { moods: ['happy'], personality: { playful: 2 }, weight: 1 } })
