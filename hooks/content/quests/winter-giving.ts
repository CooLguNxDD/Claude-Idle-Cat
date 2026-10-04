import { defineQuest } from '../types'

export default defineQuest({
  id: 'winter-giving', label: 'Winter giving', steps: [{ text: 'Exchange a gift', counter: 'exchange', goal: 1 }, { text: 'Pet twice', counter: 'pet', goal: 2 }], reward: { coins: 40, miles: 100 }, weight: 1, available: { months: [12] },
})
