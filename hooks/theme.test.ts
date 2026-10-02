import { expect, test } from 'claude-code/testing'

import { newHome } from './game'
import { frameCells } from './scene'
import { FLAVORS, FLAVOR_SETTINGS, claudeThemeOf, resolveFlavor, themeOptionFor, uiTokens } from './theme'

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
      const flavor = resolveFlavor(setting, 'dark', hour)
      expect(frameCells({ home: newHome(0), now: 0, tick: 1, hour, flavor, cols: 40 }).length).toBeGreaterThan(0)
    }
  }
})

test('each flavor makes a Claude Code theme that auto recognises', async () => {
  for (const f of Object.values(FLAVORS)) {
    const theme = claudeThemeOf(f)
    expect(theme.base).toBe(f.isLight ? 'light' : 'dark')
    expect(theme.name).toBe(`Catppuccin ${f.name[0]?.toUpperCase()}${f.name.slice(1)}`)
    expect(Object.values(theme.overrides).every(v => /^#[0-9a-f]{6}$/.test(v))).toBe(true)
    expect(theme.overrides.text).toBe(`#${f.text.toString(16)}`)
    expect(resolveFlavor('auto', theme.name, 12).name).toBe(f.name)
    expect(resolveFlavor('auto', `catppuccin-${f.name}`, 12).name).toBe(f.name)
  }
})

test('the theme option is found in either listing form', async () => {
  expect(themeOptionFor(['dark', 'light', 'custom:catppuccin-mocha'], 'mocha')).toBe('custom:catppuccin-mocha')
  expect(themeOptionFor(['dark', 'Catppuccin Frappe'], 'frappe')).toBe('Catppuccin Frappe')
  expect(themeOptionFor(['dark', 'light'], 'latte')).toBeUndefined()
})
