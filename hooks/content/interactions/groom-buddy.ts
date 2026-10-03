import { defineInteraction } from '../types'

export default defineInteraction({
  id: 'groom-buddy', label: 'Groom buddy', roles: { lead: 'groom', partner: 'loaf' }, spacing: 'touch', seconds: 12,
  when: { minBond: 80, moods: ['ok', 'happy'], weight: 1 }, bond: 4, line: 'One ear needed tidying.',
})
