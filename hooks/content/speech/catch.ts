import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'catch', on: 'catch', when: { weight: 1 }, glyph: '!', lines: ['Caught it. You may applaud.', 'Hunter mode: success.', 'It moved. I won.', 'Critter acquired. Briefly.'],
})
