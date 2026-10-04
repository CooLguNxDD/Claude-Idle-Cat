import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-shy', on: 'idle', when: { personality: ['shy'], weight: 1 }, glyph: '?', lines: ['...hi.', '*peeks out of the box*', 'You are nice. I think.', 'I will sit. Over here. Quietly.'],
})
