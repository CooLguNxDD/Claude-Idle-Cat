import { defineSkill } from '../types'

export default defineSkill({ id: 'beloved', branch: 'cuddler', name: 'Beloved', maxRank: 1, needs: 'charm', perk: 'double xp, +50% Play joy', per: { xp: 1, playJoy: 0.5 } })
