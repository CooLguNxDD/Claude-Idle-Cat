import { defineMove } from '../types'

export default defineMove({ id: 'window-watch', label: 'Window watch', pose: 'sit', cycle: 16, speed: 1, seek: 'window', seconds: [10, 25], when: { weight: 1 } })
