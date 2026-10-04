import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'gift', on: 'gift', when: { weight: 1 }, glyph: '*', lines: ['A {gift}. I will allow it.', 'Oh, a {gift}. Thanks.', 'Gift acquired: {gift}.', 'Not my favorite. Still mine.', 'I will put the {gift} in a pile.', 'Thanks. I inspected it.'],
})
