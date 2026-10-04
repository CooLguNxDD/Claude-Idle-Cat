import { defineQuest } from '../types'

export default defineQuest({
  id: 'work-buddy', label: 'Work buddy', steps: [{ text: 'Watch five tools', counter: 'tools', goal: 5 }, { text: 'Finish one reply', counter: 'turns', goal: 1 }], reward: { coins: 20, miles: 60 }, weight: 1,
})
