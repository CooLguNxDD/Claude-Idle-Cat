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

// FNV-1a over every sprite pixel and every 4x portrait a coat can paint, per flavor, marking, silhouette and shine.
const fingerprint = (coat: string) => {
  let h = 0x811c9dc5
  const feed = (s: string) => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0 }
  for (const name of FLAVOR_NAMES) for (const marking of MARKINGS) for (const isShiny of [false, true]) {
    const genes: Genes = { coat, eyes: 'odd', personality: 'lazy', isShiny, marking }
    for (const ch of 'fdwE') for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) feed(String(coatPixel(genes, FLAVORS[name], ch, x, y)))
    for (const silhouette of SILHOUETTES) {
      const c = canvas(24, 4)
      drawHiCat(pen(c), 16, 24, { genes: { ...genes, silhouette }, mood: 'happy', form: null, isAdult: true,
        isBirthday: false, isBlink: false, tick: 0 }, FLAVORS[name])
      feed(c.image(0).rgba)
    }
  }
  return h.toString(16)
}

// Fingerprints taken from the hand-written coat code before the coats moved into breed files.
const GOLDEN: Record<string, string> = {
  ginger: 'ca5b1cda', tabby: 'ac445030', grey: '81a2babe', black: 'd9d96bc',
  white: '6087f475', cream: 'fc9c6845', calico: 'ead9cfe2', tuxedo: '5e7fa36',
  siamese: '7f0654ea', chocolate: 'd12ef3c4', cinnamon: 'bdf02139', silver: '405a7dae',
  smoke: 'eb1aa5c1', tortoiseshell: 'cb1fbd96', ragdoll: '937526e0', bengal: '56a9dcfe',
  lynx: '55e4efe0', nebula: 'd3773e01',
}

for (const coat of Object.keys(GOLDEN)) test(`the ${coat} breed file paints exactly what the old coat code did`, () => {
  expect(fingerprint(coat)).toBe(GOLDEN[coat])
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
