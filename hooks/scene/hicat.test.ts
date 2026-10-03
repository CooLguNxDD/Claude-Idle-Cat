import { expect, test } from 'claude-code/testing'
import type { Genes } from '../../types'
import { COATS, SILHOUETTES } from '../adoption/registry'
import { FLAVORS, FLAVOR_NAMES } from '../theme'
import { canvas } from './canvas'
import { drawHiCat } from './hicat'
import type { HiCat } from './hicat'

// Draws one cat on a blank 4x canvas and returns its image bytes.
const draw = (cat: Partial<Omit<HiCat, 'genes'>> & { genes?: Partial<Genes> }, flavor = FLAVORS.mocha) => {
  const c = canvas(24, true)
  drawHiCat(c, 16, 24, {
    mood: 'happy', form: null, isAdult: true, isBirthday: false, isBlink: false, tick: 0, ...cat,
    genes: { coat: 'ginger', eyes: 'green', personality: 'lazy', isShiny: false, ...cat.genes },
  }, flavor)
  return c.image(0).rgba
}

test('the 4x cat paints every coat, silhouette and form in every flavor', async () => {
  const blank = canvas(24, true).image(0).rgba
  for (const name of FLAVOR_NAMES) for (const coat of COATS) for (const silhouette of SILHOUETTES)
    expect(draw({ genes: { coat, silhouette } }, FLAVORS[name])).not.toBe(blank)
  const forms = (['ninja', 'royal', 'cloud', 'chonk', null] as const).map(form => draw({ form }))
  expect(new Set(forms).size).toBe(forms.length)
})

test('the 4x cat blinks, sleeps, swishes its tail and wears its birthday hat', async () => {
  const awake = draw({})
  expect(draw({ isBlink: true })).not.toBe(awake)
  expect(draw({ mood: 'sleeping' })).not.toBe(awake)
  expect(draw({ tick: 4 })).not.toBe(awake)
  expect(draw({ isBirthday: true })).not.toBe(awake)
})
