import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'welcome', on: 'welcome', when: { weight: 1 }, glyph: '♥', lines: ['You came back. Good.', 'Welcome back. Bowl?', 'I kept the house. Mostly.', 'There you are. Finally.'],
})
