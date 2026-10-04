import { defineSkill } from '../types'

export default defineSkill({
  id: 'harmony', branch: 'cuddler', name: 'Harmony', minLevel: 20, maxRank: 1, needs: 'kinship', perk: 'pair play restores joy to both', per: { harmony: 1 },
})
