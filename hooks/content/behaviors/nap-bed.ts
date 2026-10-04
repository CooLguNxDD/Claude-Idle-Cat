import { defineBehavior } from '../types'

export default defineBehavior({
  id: 'nap-bed', label: 'Nap on the bed', pre: { isAwake: true, isTired: true }, post: { isTired: false, hasEnergy: true },
  cost: 1, seconds: 20, goTo: 'bed', move: 'nap-curl',
  effect: { sleep: true }, line: 'curls up for a nap.',
})
