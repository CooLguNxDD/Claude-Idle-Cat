import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'weather-snow', on: 'weather', about: ['snow'], when: { weight: 1 }, glyph: '*', lines: ['{weather}! Tiny cold stars.', 'Snow. I will touch one flake.', 'Too white. Still pretty.', 'Winter entered the yard.'],
})
