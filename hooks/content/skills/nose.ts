import { defineSkill } from '../types'

export default defineSkill({ id: 'nose', branch: 'hunter', name: 'Keen Nose', maxRank: 1, needs: 'claws', perk: '+50% AFK events', per: { eventRate: 0.5 } })
