import { defineQuest } from '../types'

export default defineQuest({
  id: 'pumpkin-friends', label: 'Pumpkin friends', steps: [{ text: 'Bring home ten pumpkins', counter: 'expedition', goal: 10, material: 'pumpkin' }], reward: { coins: 80, miles: 100 }, weight: 1, available: { months: [10] },
})
