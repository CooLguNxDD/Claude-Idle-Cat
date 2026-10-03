import { defineSkill } from '../types'

export default defineSkill({
  id: 'astral', branch: 'dreamer', name: 'Astral', minLevel: 15, maxRank: 1, needs: 'lucid', perk: 'offline expedition clock runs 20% faster', per: { expOffline: 0.2 },
})
