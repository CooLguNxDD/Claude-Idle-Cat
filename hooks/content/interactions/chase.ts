import { defineInteraction } from '../types'

export default defineInteraction({
  id: 'chase', label: 'Chase', roles: { lead: 'zoomies', partner: 'zoomies' }, spacing: 'chase', seconds: 10,
  when: { minBond: 0, moods: ['ok', 'happy'], weight: 1 }, bond: 2, line: 'Tag! You are it.',
})
