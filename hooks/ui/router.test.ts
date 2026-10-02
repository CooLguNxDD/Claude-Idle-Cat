import { mock, test } from 'claude-code/testing'

test('tab arrows wrap and Back follows visits, including command navigation', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  const run = (args: string) => $.command.run({ command: 'cat', args, origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 } })
  await run('show')
  for (const surface of ['terminal', 'desktop'] as const) {
    for (const columns of [34, 56]) {
      const ui = await $.ui.mount({ plugin: 'afk-cat', surface, component: 'Pane', requestId: 'afk-cat',
        props: { title: 'AFK Cat', isFocused: true, bodyColumns: columns, placement: 'dock',
          scroll: { offset: 0, bodyRows: 50 }, view: {} } })
      const check = async (key: string, step: string) => {
        if (!(await ui.find({ key }))) throw new Error(`${surface} ${columns}: ${step} missing ${key}`)
      }
      await ui.press({ key: 'tabs-back' })
      await check('pet', 'empty history')
      await ui.press({ key: 'tabs-prev' })
      await check('adopt', 'previous wraps to adoption')
      await ui.press({ key: 'tabs-back' })
      await check('pet', 'back from weather')
      await ui.press({ key: 'tabs-next' })
      await ui.press({ key: 'tabs-next' })
      await check('loan', 'two next visits reach home')
      await ui.press({ key: 'tabs-back' })
      await check('skill-claws', 'back reaches skills')
      await run('weather')
      await check('weather-system', 'command opens weather')
      await run('weather')
      await ui.press({ key: 'tabs-back' })
      await check('skill-claws', 'duplicate command does not add history')
      await ui.press({ key: 'tabs-back' })
      await check('pet', 'last back reaches cat')
      await ui.unmount()
    }
  }
})
