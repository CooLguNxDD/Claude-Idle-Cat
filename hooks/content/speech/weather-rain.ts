import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'weather-rain', on: 'weather', about: ['rain', 'drizzle', 'storm'], when: { weight: 1 }, glyph: '?', lines: ['{weather}. I stay in.', 'Wet paws are a crime.', 'The sky is leaking.', 'Rain. Window seat claimed.'],
})
