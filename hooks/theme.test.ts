import { expect, test } from 'claude-code/testing'

import { newCat } from './game'
import { frameCells } from './sprite'
import { FLAVORS, FLAVOR_SETTINGS, resolveFlavor, uiTokens } from './theme'

test('auto follows the Claude Code theme', async () => {
  expect(resolveFlavor('auto', 'light', 12).name).toBe('latte')
  expect(resolveFlavor('auto', 'light-daltonized', 12).name).toBe('latte')
  expect(resolveFlavor('auto', 'dark', 12).name).toBe('mocha')
})

test('a pinned flavor wins, daycycle follows the clock', async () => {
  expect(resolveFlavor('frappe', 'light', 12).name).toBe('frappe')
  expect(resolveFlavor('daycycle', 'dark', 10).name).toBe('latte')
  expect(resolveFlavor('daycycle', 'dark', 18).name).toBe('frappe')
  expect(resolveFlavor('daycycle', 'dark', 23).name).toBe('mocha')
  expect(resolveFlavor('nonsense', 'dark', 12).name).toBe('mocha')
})

test('palettes carry the official hex values', async () => {
  expect(FLAVORS.mocha.base).toBe(0x1e1e2e)
  expect(FLAVORS.latte.mauve).toBe(0x8839ef)
  expect(FLAVORS.macchiato.crust).toBe(0x181926)
  expect(uiTokens(FLAVORS.frappe).ok).toBe('#a6d189')
})

test('every flavor setting renders a scene', async () => {
  for (const setting of FLAVOR_SETTINGS) {
    for (const hour of [3, 12, 18]) {
      expect(frameCells(newCat(0), 0, 1, hour, resolveFlavor(setting, 'dark', hour)).length).toBeGreaterThan(0)
    }
  }
})
