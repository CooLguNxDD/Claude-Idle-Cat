import { defineSkill } from '../types'

export default defineSkill({ id: 'lucid', branch: 'dreamer', name: 'Lucid Dream', maxRank: 1, needs: 'walk', perk: '+100% coins while asleep', per: { sleepCoin: 1 } })
