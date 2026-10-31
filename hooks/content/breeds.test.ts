import { expect, test } from 'claude-code/testing'
import type { Genes } from '../../types'
import { COATS, FALLBACK_BREED, MARKINGS, SILHOUETTES, breedOf, rarityOf } from '../adoption/registry'
import { coatPixel } from '../genes'
import { canvas } from '../scene/canvas'
import { pen } from '../scene/fine/draw'
import { drawHiCat } from '../scene/hicat'
import { FLAVORS, FLAVOR_NAMES } from '../theme'
import { BREEDS } from '.'
import { breedProblems } from './types'
import type { Breed } from './types'

// FNV-1a over every sprite pixel a coat can paint, or over every 4x portrait, per flavor, marking, silhouette and shine.
const fingerprint = (coat: string, part: 'pixels' | 'portrait') => {
  let h = 0x811c9dc5
  const feed = (s: string) => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0 }
  for (const name of FLAVOR_NAMES) for (const marking of MARKINGS) for (const isShiny of [false, true]) {
    const genes: Genes = { coat, eyes: 'odd', personality: 'lazy', isShiny, marking }
    if (part === 'pixels') for (const ch of 'fdwE') for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) feed(String(coatPixel(genes, FLAVORS[name], ch, x, y)))
    else for (const silhouette of SILHOUETTES) {
      const c = canvas(24, 4)
      drawHiCat(pen(c), 16, 24, { genes: { ...genes, silhouette }, mood: 'happy', form: null, isAdult: true,
        isBirthday: false, isBlink: false, tick: 0 }, FLAVORS[name])
      feed(c.image(0).rgba)
    }
  }
  return h.toString(16)
}

// Coat pixels match the hand-written coat code from before breed files; portraits are pinned to the chibi redesign.
const GOLDEN: Record<string, [pixels: string, portrait: string]> = {
  ginger: ['7a4f9c49', '4e411f1a'], tabby: ['ca7edc31', 'a5228760'], grey: ['99c252e7', '3359d9cd'],
  black: ['71b10843', '67d22d5d'], white: ['6d6c2d65', 'da3f78c3'], cream: ['dc4a65d9', '97493b11'],
  calico: ['3c55b43b', '3ee34c02'], tuxedo: ['ac02b979', '25cf90c'], siamese: ['8b7b7a19', '9eed93bc'],
  chocolate: ['5a90ffed', 'd2a33789'], cinnamon: ['66701e5', '3e255b67'], silver: ['ce653299', '42f44516'],
  smoke: ['ea24d867', 'b0990afc'], tortoiseshell: ['d9689d39', '661a575e'], ragdoll: ['f3b502a9', '8fe388a8'],
  bengal: ['fed40cd1', '3416514e'], lynx: ['6d1e5eb9', 'c58656bf'], nebula: ['88d3b0f3', 'ad931761'],
}

for (const coat of Object.keys(GOLDEN)) test(`the ${coat} breed file paints exactly what the old coat code did`, () => {
  expect([fingerprint(coat, 'pixels'), fingerprint(coat, 'portrait')]).toEqual(GOLDEN[coat]!)
})

test('every breed file is valid, unique and keeps the legacy roll order first', () => {
  for (const breed of BREEDS) expect(breedProblems(breed)).toEqual([])
  expect(new Set(COATS).size).toBe(COATS.length)
  expect(COATS.slice(0, 18)).toEqual(Object.keys(GOLDEN))
})

test('an unknown coat paints the fallback and counts as common', () => {
  expect(breedOf('no-such-coat')).toBe(FALLBACK_BREED)
  expect(rarityOf({ coat: 'no-such-coat' })).toBe('common')
  expect(coatPixel({ coat: 'no-such-coat', eyes: 'green', personality: 'lazy', isShiny: false }, FLAVORS.mocha, 'f', 3, 3))
    .toBe(FLAVORS.mocha.peach)
})

test('the validator names bad colours, mixes and ids', () => {
  const bad = { ...FALLBACK_BREED, id: 'Bad Id', fur: 'chartreuse', dark: { mix: ['peach', 'ink', 2] } } as unknown as Breed
  expect(breedProblems(bad).length).toBe(3)
})
