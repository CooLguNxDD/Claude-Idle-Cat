import { defineCat } from '../types'

export default defineCat({
  id: 'boo', name: 'Boo',
  genes: { coat: 'ghost', eyes: 'blue', personality: 'shy', marking: 'classic', silhouette: 'classic' },
  bio: 'A gentle October ghost. Haunts empty food bowls.',
  catchphrase: 'Boo! Did I scare the tuna?',
  appears: { odds: 0.05, available: { months: [10] } },
})
