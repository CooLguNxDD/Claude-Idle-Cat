import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-cuddly', on: 'idle', when: { personality: ['cuddly'], weight: 1 }, glyph: '♥', lines: ['Pets? Pets please.', 'I missed you!', '*purrs loudly*', 'Lap status: available.'],
})
