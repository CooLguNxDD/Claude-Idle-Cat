import { defineInteraction } from '../types'

export default defineInteraction({
  id: 'nap-pile', label: 'Nap pile', roles: { lead: 'nap-curl', partner: 'nap-curl' }, spacing: 'pile', seconds: 16,
  when: { minBond: 30, moods: ['sleeping'], weight: 1 }, bond: 3, line: 'A warm heap of paws.',
})
