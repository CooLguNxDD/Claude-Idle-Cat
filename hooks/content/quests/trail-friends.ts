import { defineQuest } from '../types'

export default defineQuest({
  id: 'trail-friends', label: 'Trail friends', steps: [{ text: 'Complete one expedition', counter: 'expedition', goal: 1 }, { text: 'Bond with a friend', counter: 'bond', goal: 1 }], reward: { coins: 50, miles: 100 }, weight: 1,
})
