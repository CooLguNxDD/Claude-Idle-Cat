import { defineMove } from '../types'

export default defineMove({ id: 'cup-knock', label: 'Cup knock', pose: 'knead', cycle: 8, speed: 1, seek: 'shelf', prop: 'cup', seconds: [3, 6], when: { personality: { curious: 2 }, weight: 0.5 } })
