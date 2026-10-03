import { defineInteraction } from '../types'

export default defineInteraction({
  id: 'play-fight', label: 'Play fight', roles: { lead: 'sneak-attack', partner: 'pounce' }, spacing: 'face', seconds: 8,
  when: { minBond: 30, moods: ['ok', 'happy'], weight: 1 }, bond: 3, line: 'A very serious pretend fight.',
})
