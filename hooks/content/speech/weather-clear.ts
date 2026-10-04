import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'weather-clear', on: 'weather', about: ['clear', 'partly-cloudy'], when: { weight: 1 }, glyph: '*', lines: ['{weather}. Sun patch located.', 'The sky behaved today.', 'Warm square. Mine.', 'Clear enough for birds.'],
})
