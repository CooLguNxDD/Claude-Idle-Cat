import { defineCat } from '../types'

export default defineCat({
  id: 'merlin-meow', name: 'Merlin Meow',
  genes: { coat: 'starpoint', eyes: 'odd', personality: 'curious', marking: 'blaze', silhouette: 'fluffy' },
  bio: 'Studies ancient spells. Still cannot summon tuna.',
  catchphrase: 'Behold, the tuna spell!',
  appears: { odds: 0.05, worlds: ['backyard', 'snowy-cabin'] },
})
