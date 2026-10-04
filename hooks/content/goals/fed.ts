import { defineGoal } from '../types'

export default defineGoal({
  id: 'fed', label: 'Fed', want: { isHungry: false }, need: { stat: 'hunger', below: 45, weight: 3 },
})
