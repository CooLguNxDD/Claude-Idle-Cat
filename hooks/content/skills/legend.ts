import { defineSkill } from '../types'

export default defineSkill({
  id: 'legend', branch: 'hunter', name: 'Legend', minLevel: 25, maxRank: 1, needs: 'trailblazer', perk: '+5% rare odds', per: { rareOdds: 0.05 },
})
