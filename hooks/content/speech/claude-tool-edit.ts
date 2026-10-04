import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'claude-tool-edit', on: 'claude.tool', about: ['Edit', 'Write'], when: { weight: 1 }, glyph: '*', lines: ['Words moved. I saw.', '{tool} changed the page.', 'Editing. Do not sit there.', 'A file flinched. Cute.', 'Write write write. I approve.', 'The code got a pet.'],
})
