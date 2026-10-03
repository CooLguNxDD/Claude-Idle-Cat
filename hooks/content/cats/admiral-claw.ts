import { defineCat } from '../types'

export default defineCat({
  id: 'admiral-claw', name: 'Admiral Claw',
  genes: { coat: 'copper-bengal', eyes: 'yellow', personality: 'greedy', marking: 'mask', silhouette: 'classic' },
  bio: 'Captain Whiskers owes this pirate a lifetime of tuna.',
  catchphrase: 'Whiskers! Where is my tuna?',
  appears: { odds: 0.05, worlds: ['rooftops', 'beach-pier'] },
})
