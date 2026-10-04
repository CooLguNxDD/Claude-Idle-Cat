import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'pair-end', on: 'pair.end', role: 'lead', when: { weight: 1 }, glyph: '*', lines: ['That was enough, {buddy}.', 'Game over. I won. Probably.', 'Back to solo loafing.', 'Thanks for the chaos.'],
})
