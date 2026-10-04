import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'claude-done', on: 'claude.done', when: { weight: 1 }, glyph: '*', lines: ['Done. I helped. Obviously.', 'Turn complete. Treats?', 'You finished. I noticed.', 'Answer landed. Purr.', 'Work over. Lap now.', 'That reply was adequate.'],
})
