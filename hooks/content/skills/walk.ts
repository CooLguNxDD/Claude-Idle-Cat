import { defineSkill } from '../types'

export default defineSkill({ id: 'walk', branch: 'dreamer', name: 'Dream Walk', maxRank: 1, needs: 'deep', perk: '+4h counted while away', per: { offlineHours: 4 } })
