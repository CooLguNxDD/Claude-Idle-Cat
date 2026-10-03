import { defineSkill } from '../types'

export default defineSkill({
  id: 'scout', branch: 'hunter', name: 'Scout', minLevel: 15, maxRank: 1, needs: 'apex', perk: '15% shorter expeditions', per: { expTime: -0.15 },
})
