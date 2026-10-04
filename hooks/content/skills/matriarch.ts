import { defineSkill } from '../types'

export default defineSkill({
  id: 'matriarch', branch: 'cuddler', name: 'Matriarch', minLevel: 25, maxRank: 1, needs: 'harmony', perk: '+1 party size', per: { party: 1 },
})
