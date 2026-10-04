import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'pair-start-lead', on: 'pair.start', role: 'lead', when: { weight: 1 }, glyph: '!', lines: ['{buddy}, you are it.', 'Come here. I have a plan.', 'Pair mode: I lead.', 'Hey {buddy}. Follow.'],
})
