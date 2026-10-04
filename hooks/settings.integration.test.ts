import { expect, mock, test } from 'claude-code/testing'
import { newHome } from './game'
import type { Home } from '../types'

test('Settings persists every plugin config through the host, mutes sound immediately and saves household preferences', async ($, on) => {
  const now = new Date(2026, 9, 5, 12).getTime()
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), rev: 100, worlds: ['backyard', 'neon-alley'] }
  const rows = [
    { key: 'afk-cat.sound', label: 'Sound effects', kind: 'boolean', value: true },
    { key: 'afk-cat.flavor', label: 'Catppuccin flavor', kind: 'text', value: 'auto' },
    { key: 'afk-cat.skin', label: 'Cat interface', kind: 'text', value: 'full' },
    { key: 'afk-cat.canvas', label: 'Pane canvas', kind: 'text', value: 'auto' },
    { key: 'afk-cat.reactions', label: 'Claude reactions', kind: 'text', value: 'on' },
  ]
  const writes: string[] = [], sounds: string[] = [], notices: string[] = []
  let deny = false
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => { stored = e.value as Home; return { value: undefined } })
  on('config.list', () => ({ value: rows as never }))
  on('config.set', (_, e) => {
    if (deny) return { deny: 'Managed by policy' }
    const row = rows.find(r => r.key === e.key)!
    row.value = e.value as string | boolean
    writes.push(e.key)
    return { value: e.value }
  })
  on('env.get', () => ({ value: undefined }))
  on('audio.play', (_, e) => { sounds.push(e.clip.asset!); return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } })); on('ui.status', () => ({ value: undefined }))
  on('ui.toast', (_, e) => { notices.push(e.text); return { value: undefined } })
  const run = () => $.command.run({ command: 'cat', args: 'settings', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  await run()
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 56, placement: 'dock', scroll: { offset: 0, bodyRows: 50 }, view: {} } })
  expect(await ui.find({ type: 'Text', text: 'Cat settings' })).toBeDefined()
  await ui.press({ key: 'settings-sound-preview' })
  expect(sounds).toEqual(['assets/sfx/levelup.wav'])
  await ui.press({ key: 'setting-afk-cat.sound-toggle' })
  await ui.press({ key: 'settings-sound-preview' })
  expect(sounds.length).toBe(1)
  for (const [field, value] of [['flavor', 'latte'], ['skin', 'off'], ['canvas', 'text'], ['reactions', 'quiet']]) {
    await ui.press({ key: `setting-afk-cat.${field}-${value}` })
  }
  expect(writes).toEqual(rows.map(r => r.key))
  const glow = stored.prefs.glow, units = stored.weather.units
  await ui.press({ key: 'settings-glow' }); await ui.press({ key: 'settings-weather-units' })
  await ui.press({ key: 'settings-world-neon-alley' })
  expect(stored.prefs.glow).toBe(!glow)
  expect(stored.weather.units).not.toBe(units)
  expect(stored.world.id).toBe('neon-alley')
  deny = true
  await ui.press({ key: 'setting-afk-cat.sound-toggle' })
  await ui.press({ key: 'settings-sound-preview' })
  expect(sounds.length).toBe(1)
  expect(notices.some(n => /Managed by policy/.test(n))).toBe(true)
  await ui.unmount(); await run()
  const desktop = await $.ui.mount({ plugin: 'afk-cat', surface: 'desktop', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 56, placement: 'dock', scroll: { offset: 0, bodyRows: 50 }, view: {} } })
  expect(await desktop.find({ type: 'Text', text: /Sound effects · off/ })).toBeDefined()
  await desktop.unmount()
})
