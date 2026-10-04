import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'pair-start-partner', on: 'pair.start', role: 'partner', when: { weight: 1 }, glyph: '?', lines: ['Me? Okay, {buddy}.', 'I was not doing anything.', 'Fine. One game.', 'You started it, {buddy}.'],
})
