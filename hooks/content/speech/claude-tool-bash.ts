import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'claude-tool-bash', on: 'claude.tool', about: ['Bash'], when: { weight: 1 }, glyph: '!', lines: ['The terminal clicked. Again.', 'Bash. I heard the terminal clicked.', 'Shell noise. Terminal clicked.', 'Commands. The terminal clicked.'],
})
