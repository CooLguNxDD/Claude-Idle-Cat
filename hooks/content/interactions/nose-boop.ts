import { defineInteraction } from '../types'

export default defineInteraction({
  id: 'nose-boop', label: 'Nose boop', roles: { lead: 'sit', partner: 'sit' }, spacing: 'touch', seconds: 6,
  when: { minBond: 0, moods: ['ok', 'happy'], weight: 1 }, bond: 2, line: 'A tiny nose boop.',
})
