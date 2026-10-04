import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-night', on: 'idle', when: { hours: [22, 5], weight: 2 }, glyph: 'z', lines: ['The house is finally quiet.', 'Night shift. I supervise.', 'Stars out. Nap in.', 'Shh. The bugs are sleeping.'],
})
