import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-playful', on: 'idle', when: { personality: ['playful'], weight: 1 }, glyph: '*', lines: ['Throw the yarn! THROW IT!', 'I am so fast today!', 'Bet you cannot catch me!', 'Zoomies incoming. Clear the desk.'],
})
