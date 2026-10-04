import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-lazy', on: 'idle', when: { personality: ['lazy'], weight: 1 }, glyph: 'z', lines: ["*yawns* oh, it's you", 'Is it nap time? It is always nap time.', 'Wake me when the fish arrives.', 'Five more minutes. Maybe six.'],
})
