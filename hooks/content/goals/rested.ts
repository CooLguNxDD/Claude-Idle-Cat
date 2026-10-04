import { defineGoal } from '../types'

export default defineGoal({
  id: 'rested', label: 'Rested', want: { isTired: false }, need: { stat: 'energy', below: 30, weight: 2.5 },
  personality: { lazy: 1.5 },
})
