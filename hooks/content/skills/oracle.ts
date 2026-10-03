import { defineSkill } from '../types'

export default defineSkill({
  id: 'oracle', branch: 'dreamer', name: 'Oracle', minLevel: 25, maxRank: 1, needs: 'stargazer', perk: 'preview seeded expedition rewards', per: { oracle: 1 },
})
