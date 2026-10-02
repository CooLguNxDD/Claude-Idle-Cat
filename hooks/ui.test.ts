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
    await ui.press({ key: 'cat-list' })
    expect(await ui.find({ key: 'cat-c1' })).toBeDefined()
    await ui.press({ key: 'cat-c1' })
    expect(await ui.find({ type: 'Text', text: /front and centre/ })).toBeDefined()
    expect(await ui.find({ key: 'cat-c1' })).toBeUndefined()
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

test('Play opens the arcade, a round runs in a Client and its result pays', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: {} }))
  await $.command.run({
    command: 'cat', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'afk-cat', surface, component: 'Pane', requestId: 'afk-cat',
      props: { title: 'AFK Cat', isFocused: true, bodyColumns: 50, placement: 'dock',
        scroll: { offset: 0, bodyRows: 40 }, view: {} },
    })
    await ui.press({ key: 'play' })
    expect(await ui.find({ key: 'game-dash' })).toBeDefined()
    await ui.press({ key: 'game-dash' })
    expect(await ui.find({ key: 'arcade' })).toBeDefined()
    await ui.advance(100)
    await ui.key({ key: ' ', in: 'arcade' })
    await ui.advance(500)
    expect(await ui.find({ type: 'Text', text: /Rooftop Dash · \d+ pts/, in: 'arcade' })).toBeDefined()
    await clock.advance(40_000)
    await ui.post({ kind: 'result', game: 'dash', score: 600, ms: 40_000 }, { in: 'arcade' })
    expect(await ui.find({ key: 'arcade' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /scored 600 in Rooftop Dash · silver medal/ })).toBeDefined()
    await ui.press({ key: 'tab-cat' })
    await ui.unmount()
  }
})
