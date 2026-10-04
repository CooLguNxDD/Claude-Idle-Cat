import { defineGoal } from '../types'

export default defineGoal({
  id: 'tidy', label: 'Tidy', want: { isBored: false }, need: { stat: 'joy', below: 70, weight: 0.5 },
})
