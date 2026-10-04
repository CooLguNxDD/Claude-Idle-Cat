import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'pet', on: 'pet', when: { weight: 1 }, glyph: '♥', lines: ['Purr engine: online.', 'Again. Right there.', 'Chin scratch detected.', 'I will allow this.', 'That was the good spot.', 'Okay. More. Briefly.'],
})
