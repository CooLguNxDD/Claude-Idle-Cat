import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-grumpy', on: 'idle', when: { moods: ['grumpy'], weight: 2 }, glyph: '!', lines: ['Not now. Bowl first.', 'Hmph. The day is wrong.', 'I am fine. I am not fine.', 'Feed me, then we talk.'],
})
