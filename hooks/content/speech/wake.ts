import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'wake', on: 'wake', when: { weight: 1 }, glyph: '*', lines: ['I have returned from the void.', '*stretches* What year is it?', 'Awake. Regretting it.', 'Nap over. Snacks next.'],
})
