import { defineSkill } from '../types'

export default defineSkill({ id: 'deep', branch: 'dreamer', name: 'Deep Sleep', maxRank: 1, needs: 'catnap', perk: 'energy fades 30% slower', per: { energyDecay: -0.3 } })
