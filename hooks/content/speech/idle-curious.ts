import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-curious', on: 'idle', when: { personality: ['curious'], weight: 1 }, glyph: '?', lines: ["What's that? And that?", 'I saw a bird. A BIRD.', 'What are you typing?', 'New key. Must investigate.'],
})
