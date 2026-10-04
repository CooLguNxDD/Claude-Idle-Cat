import { defineSkill } from '../types'

export default defineSkill({ id: 'charm', branch: 'cuddler', name: 'Charm', maxRank: 1, needs: 'purr', perk: 'joy fades 30% slower', per: { joyDecay: -0.3 } })
