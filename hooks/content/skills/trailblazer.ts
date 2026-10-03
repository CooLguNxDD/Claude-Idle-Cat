import { defineSkill } from '../types'

export default defineSkill({
  id: 'trailblazer', branch: 'hunter', name: 'Trailblazer', minLevel: 20, maxRank: 1, needs: 'scout', perk: '+1 material roll', per: { matRolls: 1 },
})
