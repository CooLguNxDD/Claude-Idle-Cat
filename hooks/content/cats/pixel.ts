import { defineCat } from '../types'

export default defineCat({
  id: 'pixel', name: 'Pixel',
  genes: { coat: 'calico-void', eyes: 'green', personality: 'curious', marking: 'socks', silhouette: 'fold' },
  bio: 'Neon courier. Delivers secrets and stolen snacks.',
  catchphrase: 'Delivery! Mostly crumbs.',
  appears: { odds: 0.05, worlds: ['neon-alley'] },
})
