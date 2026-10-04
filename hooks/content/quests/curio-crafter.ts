import { defineQuest } from '../types'

export default defineQuest({
  id: 'curio-crafter', label: 'Curio crafter', steps: [{ text: 'Complete an expedition', counter: 'expedition', goal: 1 }, { text: 'Craft at Pip’s', counter: 'craft', goal: 1 }], reward: { miles: 150 }, weight: 1,
})
