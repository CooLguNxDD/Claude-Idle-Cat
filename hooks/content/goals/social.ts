import { defineGoal } from '../types'

export default defineGoal({
  id: 'social', label: 'Social', want: { isLonely: false }, need: { stat: 'joy', below: 50, weight: 1.5 },
  personality: { cuddly: 1.5, shy: 0.6 },
})
