import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'claude-error', on: 'claude.error', when: { weight: 1 }, glyph: '!', lines: ['That turn went sideways.', 'Error smell. Hiss optional.', 'Something broke. Not me.', 'Try again. I will watch.', 'The machine grumbled.', 'Oops. I saw nothing.'],
})
