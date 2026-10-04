import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'done-groom', on: 'done', about: ['groom-self'], when: { weight: 1 }, glyph: '*', lines: ['That tuft is defeated.', 'Clean enough. For now.', 'Tongue tired. Fur smug.', 'Grooming complete. Ish.'],
})
