import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'claude-tool-read', on: 'claude.tool', about: ['Read', 'Grep', 'Glob'], when: { weight: 1 }, glyph: '?', lines: ['{tool}. Looking. I look too.', 'Searching the paper pile.', 'Read mode. Quiet paws.', 'Found something? Show me.', 'Grep is just hunting.', 'So many files. One cat.'],
})
