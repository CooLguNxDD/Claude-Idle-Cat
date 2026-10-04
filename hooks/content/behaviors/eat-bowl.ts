import { defineBehavior } from '../types'

export default defineBehavior({
  id: 'eat-bowl', label: 'Eat from the bowl', pre: { isAwake: true, isHungry: true, bowlHasFood: true }, post: { isHungry: false },
  cost: 1, seconds: 6, goTo: 'bowl', move: 'eat',
  effect: { hunger: 30, bowl: -1, xp: 2, friendship: 1 }, line: 'munches from the bowl. +2xp',
})
