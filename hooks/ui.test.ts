import { expect, mock, test } from 'claude-code/testing'

test('the pane draws the scene and its buttons work on each surface', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  await $.command.run({
    command: 'cat', args: '', origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'afk-cat', surface, component: 'Pane', requestId: 'afk-cat',
      props: { title: 'AFK Cat', isFocused: true, bodyColumns: 60, placement: 'dock',
        scroll: { offset: 0, bodyRows: 30 }, view: {} },
    })
    if (surface === 'terminal') expect(await ui.find({ key: 'scene' })).toBeDefined()
    expect(await ui.find({ key: 'adopt' })).toBeDefined()
    await ui.press({ key: 'pet' })
    expect(await ui.find({ type: 'Text', text: /purrs/ })).toBeDefined()
    await ui.press({ key: 'tab-skills' })
    expect(await ui.find({ type: 'Text', text: /Skill points: 0/ })).toBeDefined()
    await ui.press({ key: 'skill-claws' })
    expect(await ui.find({ type: 'Text', text: /no skill points/ })).toBeDefined()
    await ui.press({ key: 'tab-cat' })
    await ui.unmount()
  }
})
