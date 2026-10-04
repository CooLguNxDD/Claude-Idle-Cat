import { defineEvent } from '../types'

export default defineEvent({
  id: 'gift-exchange', label: 'Gift exchange', kind: 'exchange', available: { months: [12] }, bond: 3,
})
