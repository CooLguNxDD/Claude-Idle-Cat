import { defineBehavior } from '../types'

export default defineBehavior({
  id: 'play-buddy', label: 'Play with a friend', pre: { isAwake: true, hasEnergy: true, hasBuddy: true, isLonely: true },
  post: { isLonely: false }, cost: 1, seconds: 8, partner: true, move: 'sit',
  effect: { joy: 10, energy: -5, bond: 2 }, line: 'plays with a friend.',
})
