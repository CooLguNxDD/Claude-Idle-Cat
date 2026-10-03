import { defineCat } from '../types'

export default defineCat({
  id: 'nova', name: 'Nova',
  genes: { coat: 'golden-glitch', eyes: 'odd', personality: 'playful', marking: 'spots', silhouette: 'classic' },
  bio: 'Station explorer. Claims every sunbeam for catkind.',
  catchphrase: 'One small leap for a cat.',
  appears: { odds: 0.05, worlds: ['space-station'] },
})
