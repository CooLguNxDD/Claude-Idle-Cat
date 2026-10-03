import { defineSkill } from '../types'

export default defineSkill({ id: 'purr', branch: 'cuddler', name: 'Purr Engine', maxRank: 1, needs: 'paws', perk: '+50% xp', per: { xp: 0.5 } })
