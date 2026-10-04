import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'claude-prompt', on: 'claude.prompt', when: { weight: 1 }, glyph: '?', lines: ['New prompt. Ears up.', 'You are typing. I help.', 'Thinking face. I have one.', 'A task. I will supervise.', 'Prompt received. Paws ready.', 'What are we breaking today?'],
})
