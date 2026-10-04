import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'test-fail', on: 'test.fail', when: { weight: 1 }, glyph: '!', lines: ['A test failed. Rude.', 'Red text. I disapprove.', 'The checks hissed back.', 'Fail. I will stare at it.', 'Not my bug. Probably.', 'Try again. I am watching.'],
})
