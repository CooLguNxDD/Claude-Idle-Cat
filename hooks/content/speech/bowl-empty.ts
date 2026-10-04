import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'bowl-empty', on: 'bowl.empty', when: { weight: 1 }, glyph: '?', lines: ['The bowl is a lie.', 'No {food}. This is rude.', '{name} stared. The bowl blinked.', 'Empty again. Impressive.'],
})
