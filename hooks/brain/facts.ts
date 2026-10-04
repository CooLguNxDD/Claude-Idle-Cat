import type { Cat, Home } from '../../types'
import type { Facts } from '../content/types'
import { catsAtHome } from '../away'

/** Boolean world the planner sees. Thresholds match the starter goals. */
export const factsOf = (home: Home, cat: Cat): Facts => ({
  isAwake: !cat.isAsleep,
  isHungry: cat.hunger < 45,
  isTired: cat.energy < 30,
  isLonely: cat.joy < 50,
  isBored: cat.joy < 70,
  hasEnergy: cat.energy >= 30,
  bowlHasFood: home.bowl.food > 0,
  hasBuddy: catsAtHome(home).some(c => c.id !== cat.id && !c.isAsleep),
})
