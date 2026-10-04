import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'plan-nap', on: 'plan', about: ['nap-bed'], when: { weight: 1 }, glyph: 'z', lines: ['Bed. Now. Nonnegotiable.', 'Energy bar: gone. Nap: yes.', 'I will be horizontal shortly.', 'The pillow requested me.'],
})
