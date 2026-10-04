import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'gift-loved', on: 'gift.loved', when: { weight: 2 }, glyph: '♥', lines: ['A {gift}! My favorite!', 'You remembered the {gift}!', '{gift}. I knew you would.', 'Favorite detected. Purring.', 'The {gift} stays forever.', 'Best gift. No notes.'],
})
