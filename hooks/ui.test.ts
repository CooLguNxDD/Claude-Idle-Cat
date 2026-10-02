import { expect, mock, test } from 'claude-code/testing'

test('the pane draws the scene and its buttons work on each surface', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.close', () => ({ value: undefined }))
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
    await ui.press({ key: 'tab-friends' })
    expect(await ui.find({ type: 'Text', text: /Give Mochi a gift/ })).toBeDefined()
    await ui.press({ key: 'gift-ribbon' })
    expect(await ui.find({ type: 'Text', text: /ribbon|already got a gift/ })).toBeDefined()
    await ui.press({ key: 'tab-home' })
    // The loan taken on the first surface carries over to the next.
    if (surface === 'terminal') {
      expect(await ui.find({ type: 'Text', text: /Cottage/ })).toBeDefined()
      await ui.press({ key: 'loan' })
    }
    expect(await ui.find({ type: 'Text', text: /House ·/ })).toBeDefined()
    expect(await ui.find({ key: 'pay' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Catnip market/ })).toBeDefined()
    await ui.press({ key: 'tab-book' })
    expect(await ui.find({ type: 'Text', text: /Museum ·/ })).toBeDefined()
    await ui.press({ key: 'tab-miles' })
    expect(await ui.find({ type: 'Text', text: /Paw Miles/ })).toBeDefined()
    await ui.press({ key: 'miles-charm' })
    expect(await ui.find({ type: 'Text', text: /miles\./ })).toBeDefined()
    await ui.press({ key: 'tab-cat' })
    await ui.unmount()
  }
})

test('/cat hide closes the pane and unknown words show help', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  const closed: string[] = []
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.close', ($, e) => {
    closed.push(e.id)
    return { value: undefined }
  })
  const run = (args: string) => $.command.run({
    command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })
  expect((await run('hide')).text).toMatch(/keep earning/)
  expect(closed).toEqual(['afk-cat'])
  expect((await run('hlep')).text).toMatch(/\/cat hide/)
  expect((await run('show')).text).toMatch(/in the pane/)
})
