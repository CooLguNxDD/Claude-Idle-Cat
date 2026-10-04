import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'pair-end-close', on: 'pair.end', role: 'lead', when: { minBond: 2, weight: 3 }, glyph: '♥', lines: ['Stay close, {buddy}.', 'Best nap partner. Fact.', 'We should do that again.', 'I like you. Do not tell.'],
})
