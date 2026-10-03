import { defineCat } from '../types'

export default defineCat({
  id: 'captain-whiskers', name: 'Captain Whiskers',
  genes: { coat: 'smoke', eyes: 'odd', personality: 'lazy', marking: 'mask', silhouette: 'fold' },
  bio: "Retired ship's cat. Has opinions about tuna.",
  catchphrase: 'Arr, feed me.',
  appears: { odds: 0.05 },
})
