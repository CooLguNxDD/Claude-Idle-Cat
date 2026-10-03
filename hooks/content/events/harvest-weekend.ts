import { defineEvent } from '../types'

export default defineEvent({
  id: 'harvest-weekend', label: 'Harvest weekend', kind: 'boost', available: { months: [10, 11] }, weekdays: [0, 6], materials: 1.5,
})
