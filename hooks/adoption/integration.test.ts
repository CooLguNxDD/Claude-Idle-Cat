import { expect, mock, test } from 'claude-code/testing'
import type { Home } from '../../types'
import { newHome } from '../game'

test('Adopt is its own tab, charges one successful roll and Back returns to the Cat pane', async ($, on) => {
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
    const coins = stored.coins
    await ui.press({ key: 'adopt' })
    if (surface === 'terminal') {
      expect(stored.shelter.pulls).toBe(1)
      expect(stored.coins).toBe(coins - 100)
      await check('shelter-meet', 'successful roll')
    } else {
      expect(stored.shelter.pulls).toBe(1)
      expect(stored.coins).toBe(coins)
    }
    await ui.press({ key: 'shelter-meet' })
    await check('pet', 'meet')
    await ui.press({ key: 'tabs-back' })
    await check('adopt', 'back to shelter')
    await ui.press({ key: 'tabs-back' })
    await check('pet', 'back to cat')
    await ui.unmount()
  }
})
