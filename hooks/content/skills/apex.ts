import { defineSkill } from '../types'

export default defineSkill({ id: 'apex', branch: 'hunter', name: 'Apex Pounce', maxRank: 1, needs: 'prowl', perk: '+50% coins', per: { coin: 0.5 } })
