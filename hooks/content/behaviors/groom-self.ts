import { defineBehavior } from '../types'

export default defineBehavior({
  id: 'groom-self', label: 'Groom', pre: { isAwake: true }, post: { isBored: false },
  cost: 1, seconds: 5, move: 'groom', effect: { joy: 5 }, line: 'grooms a bothersome tuft.',
})
