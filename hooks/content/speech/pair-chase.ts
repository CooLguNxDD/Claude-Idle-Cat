import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'pair-chase', on: 'pair.start', about: ['chase'], role: 'lead', when: { weight: 2 }, glyph: '!', lines: ['Chase accepted. Run, {buddy}!', 'Tag! You are slower.', 'Zoomies, officially shared.', 'If I catch you, you nap.'],
})
