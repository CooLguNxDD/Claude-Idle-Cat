import { defineSkill } from '../types'

export default defineSkill({
  id: 'stargazer', branch: 'dreamer', name: 'Stargazer', minLevel: 20, maxRank: 1, needs: 'astral', perk: 'double stardust weight', per: { stardust: 1 },
})
