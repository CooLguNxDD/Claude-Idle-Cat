import { expect, mock, test } from 'claude-code/testing'
import { TABS } from './ui/tabs'

test('the pane draws the scene and its buttons work on each surface', { timeoutMs: 15_000 }, async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  on('config.list', () => ({ value: [] }))
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
    const openTab = async (key: string) => {
      for (let i = 0; i < TABS.length && !(await ui.find({ key })); i++) await ui.press({ key: 'tabs-next' })
      await ui.press({ key })
    }
    if (surface === 'terminal') expect(await ui.find({ key: 'scene' })).toBeDefined()
    expect(await ui.find({ key: 'adopt' })).toBeUndefined()
    await ui.press({ key: 'pet' })
    expect(await ui.find({ type: 'Text', text: /purrs/ })).toBeDefined()
    await openTab('tab-skills')
    expect(await ui.find({ type: 'Text', text: /Skill points: 0/ })).toBeDefined()
    await ui.press({ key: 'skill-claws' })
    expect(await ui.find({ type: 'Text', text: /no skill points/ })).toBeDefined()
    await openTab('tab-friends')
    expect(await ui.find({ type: 'Text', text: /Give Mochi a gift/ })).toBeDefined()
    await ui.press({ key: 'gift-ribbon' })
    expect(await ui.find({ type: 'Text', text: /ribbon|already got a gift/ })).toBeDefined()
    await openTab('tab-home')
    // The loan taken on the first surface carries over to the next.
    if (surface === 'terminal') {
      expect(await ui.find({ type: 'Text', text: /Cottage/ })).toBeDefined()
      await ui.press({ key: 'loan' })
    }
    expect(await ui.find({ type: 'Text', text: /House ·/ })).toBeDefined()
    expect(await ui.find({ key: 'pay' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Catnip market/ })).toBeDefined()
    await openTab('tab-book')
    expect(await ui.find({ type: 'Text', text: /Museum ·/ })).toBeDefined()
    await openTab('tab-miles')
    expect(await ui.find({ type: 'Text', text: /Paw Miles/ })).toBeDefined()
    await ui.press({ key: 'miles-charm' })
    expect(await ui.find({ type: 'Text', text: /miles\./ })).toBeDefined()
    await openTab('tab-cat')
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


test('Play opens the browser arcade; rounds the server relays are checked and paid', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  mock.env(on, {})
  on('audio.play', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: {} }))
  // A stand-in server: the test writes its stdout lines; the mod's pushes and the browser opening are recorded.
  const lines: string[] = []
  const waiting = { wake: null as (() => void) | null, isDone: false }
  const say = (message: object) => {
    lines.push(`${JSON.stringify(message)}\n`)
    waiting.wake?.()
  }
  const spawned: (readonly string[])[] = []
  on('process.spawn', async function* ($, e) {
    spawned.push(e.argv)
    while (!waiting.isDone) {
      const text = lines.shift()
      if (text) yield { stream: 'stdout' as const, text }
      else await new Promise<void>(resolve => { waiting.wake = resolve })
    }
    return { value: { code: 0, signal: null } }
  })
  const pushed: { round: { game: string } | null; menu: { log: string } }[] = []
  on('http.fetch', ($, e) => {
    if (e.url.endsWith('/api/state')) pushed.push(JSON.parse(e.init?.body ?? '{}'))
    return { value: { status: 200, ok: true, headers: {}, text: '{"ok":true}' } }
  })
  const opened: (readonly string[])[] = []
  on('process.run', ($, e) => {
    opened.push(e.argv)
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  const settle = async () => {
    for (let i = 0; i < 5; i++) await clock.advance(1)
  }
  await $.command.run({
    command: 'cat', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })
  const ui = await $.ui.mount({
    plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  })
  say({ kind: 'ready', port: 5555 })
  await ui.press({ key: 'play' })
  expect(spawned[0]?.[0]).toBe('node')
  expect(spawned[0]?.[1]).toMatch(/server\/arcade\.mjs$/)
  expect(opened.at(-1)?.at(-1)).toMatch(/^http:\/\/localhost:5555\/\?t=[0-9a-f]{32}$/)
  expect(pushed.at(-1)?.round).toBeNull()
  expect(await ui.find({ key: 'game-tank' })).toBeDefined()
  expect(await ui.find({ type: 'Link' })).toBeDefined()

  say({ kind: 'start', game: 'dash' })
  await settle()
  expect(pushed.at(-1)?.round?.game).toBe('dash')
  expect(await ui.find({ type: 'Text', text: /is playing Rooftop Dash in the browser/ })).toBeDefined()

  // A short round keeps the mocked clock (and the scene's repaints) small; medal pay is in rewards.test.
  await clock.advance(3000)
  say({ kind: 'result', game: 'dash', score: 100, ms: 3000 })
  await settle()
  expect(await ui.find({ type: 'Text', text: /scored 100 in Rooftop Dash · no medal/ })).toBeDefined()
  expect(pushed.at(-1)?.round).toBeNull()
  // A second result for a round that is no longer open pays nothing.
  const coins = pushed.length
  say({ kind: 'result', game: 'dash', score: 900, ms: 3000 })
  await settle()
  expect(pushed.length).toBe(coins)
  waiting.isDone = true
  waiting.wake?.()
  await ui.unmount()

  const desk = await $.ui.mount({
    plugin: 'afk-cat', surface: 'desktop', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  })
  expect(await desk.find({ key: 'arcade-open' })).toBeDefined()
  await desk.unmount()
})
