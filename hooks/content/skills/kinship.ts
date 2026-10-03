import { defineSkill } from '../types'

export default defineSkill({
  id: 'kinship', branch: 'cuddler', name: 'Kinship', minLevel: 15, maxRank: 1, needs: 'beloved', perk: '+50% bonds', per: { bond: 0.5 },
})
