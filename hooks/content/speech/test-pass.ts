import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'test-pass', on: 'test.pass', when: { weight: 1 }, glyph: '*', lines: ['Tests passed. I knew.', 'Green. My favorite color.', 'The checks agreed with me.', 'Passing tests. Celebration loaf.', 'All good. I take credit.', 'Success. Tiny parade.'],
})
