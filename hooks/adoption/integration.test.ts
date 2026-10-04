import { expect, mock, test } from 'claude-code/testing'
import type { Home } from '../../types'
import { newHome } from '../game'

test('Adopt is its own tab, charges one successful roll and Back returns to the Cat pane', { timeoutMs: 15_000 }, async ($, on) => {
  const now = 1_700_000_000_000
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), coins: 1000, rev: 100 }
  on('store.get', () => ({ value: stored }))
  on('store.set', ($, e) => { stored = e.value as Home; return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: {} }))
  const run = (args: string) => $.command.run({ command: 'cat', args, origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 } })
  await run('show')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'afk-cat', surface, component: 'Pane', requestId: 'afk-cat',
      props: { title: 'AFK Cat', isFocused: true, bodyColumns: 36, placement: 'dock',
        scroll: { offset: 0, bodyRows: 50 }, view: {} } })
    const check = async (key: string, step: string) => {
      if (!(await ui.find({ key }))) throw new Error(`${surface}: ${step} missing ${key}`)
    }
    expect(await ui.find({ key: 'adopt' })).toBeUndefined()
    await run('shelter')
    await check('adopt', 'shelter command')
    expect(await ui.find({ type: 'Text', text: /Legendary 1%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Epic 4%.*Ghost/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Ghost: available in October/ })).toBeDefined()
    const coins = stored.coins
    await ui.press({ key: 'adopt' })
    if (surface === 'terminal') {
      expect(stored.shelter.pulls).toBe(0)
      expect(stored.shelter.pending?.id).toBe('c2')
      expect(stored.coins).toBe(coins - 100)
      await check('reveal-open', 'paid parcel')
      await ui.press({ key: 'reveal-open' })
      await ui.press({ key: 'reveal-confirm' })
      expect(stored.shelter.pulls).toBe(1)
      expect(stored.cats.length).toBe(2)
    } else {
      expect(stored.shelter.pulls).toBe(1)
      expect(stored.coins).toBe(coins)
      expect(await ui.find({ key: 'reveal-open' })).toBeUndefined()
      await ui.press({ key: 'shelter-meet' })
    }
    await check('pet', 'meet')
    await run('shelter')
    await check('adopt', 'back to shelter')
    await ui.press({ key: 'tabs-back' })
    await check('pet', 'back to cat')
    await ui.unmount()
  }
})

test('October shelter odds include Ghost and the collection book labels its season', async ($, on) => {
  const now = new Date(2026, 9, 15, 12).getTime()
  mock.clock(on, { now })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: {} }))
  const run = (args: string) => $.command.run({ command: 'cat', args, origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 } })
  await run('show')
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 36, placement: 'dock',
      scroll: { offset: 0, bodyRows: 50 }, view: {} } })
  await run('shelter')
  expect(await ui.find({ type: 'Text', text: /Epic 4%.*Ghost/ })).toBeDefined()
  for (let i = 0; i < 9 && !(await ui.find({ key: 'tab-book' })); i++) await ui.press({ key: 'tabs-next' })
  await ui.press({ key: 'tab-book' })
  expect(await ui.find({ type: 'Text', text: /Coats.*\(October\)/ })).toBeDefined()
  await ui.unmount()
})

test('the arrival card offers Pull again while there is room and coins', async ($, on) => {
  const now = 1_700_000_000_000
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), tier: 2, coins: 1000, rev: 100 }
  on('store.get', () => ({ value: stored }))
  on('store.set', ($, e) => { stored = e.value as Home; return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: {} }))
  const run = (args: string) => $.command.run({ command: 'cat', args, origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 } })
  await run('show')
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 36, placement: 'dock',
      scroll: { offset: 0, bodyRows: 50 }, view: {} } })
  await run('shelter')
  expect(await ui.find({ key: 'shelter-again' })).toBeUndefined()
  const confirm = async () => {
    await ui.press({ key: 'reveal-open' })
    await ui.press({ key: 'reveal-confirm' })
    await run('shelter')
  }
  await ui.press({ key: 'adopt' })
  await confirm()
  await ui.press({ key: 'shelter-again' })
  await confirm()
  expect(stored.shelter.pulls).toBe(2)
  expect(stored.cats.length).toBe(3)
  await ui.press({ key: 'shelter-again' })
  await confirm()
  expect(stored.cats.length).toBe(4)
  expect(await ui.find({ key: 'shelter-again' })).toBeUndefined()
  await ui.unmount()
})
