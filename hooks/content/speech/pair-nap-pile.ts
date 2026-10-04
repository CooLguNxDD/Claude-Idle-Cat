import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'pair-nap-pile', on: 'pair.start', about: ['nap-pile'], when: { weight: 2 }, glyph: 'z', lines: ['Pile formation with {buddy}.', 'Two cats. One nap.', 'Warm. Stay.', 'No moving. This is the plan.'],
})
