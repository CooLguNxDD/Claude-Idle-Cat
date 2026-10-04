import { defineQuest } from '../types'

export default defineQuest({
  id: 'daily-care', label: 'Little comforts', steps: [{ text: 'Pet three times', counter: 'pet', goal: 3 }, { text: 'Feed two fish', counter: 'feed', goal: 2 }], reward: { coins: 30, miles: 80 }, weight: 1,
})
