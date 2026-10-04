import { expect, mock, test } from 'claude-code/testing'

const now = 1_700_000_000_000
const current = { utc_offset_seconds: 0, current: { time: now / 1000, weather_code: 61, temperature_2m: 10,
  wind_speed_10m: 15, wind_direction_10m: 180, cloud_cover: 90, precipitation: 1, is_day: 1 } }

test('city selection works in the pane, saves weather, changes units and clears location', { timeoutMs: 15_000 }, async ($, on) => {
  mock.clock(on, { now })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  const urls: string[] = []
  on('http.fetch', ($, e) => {
    urls.push(e.url)
    const data = e.url.includes('geocoding') ? { results: [
      { name: 'London', admin1: 'England', country: 'United Kingdom', latitude: 51.5, longitude: -0.12 },
      { name: 'London', admin1: 'Ontario', country: 'Canada', latitude: 42.98, longitude: -81.23 },
    ] } : current
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(data) } }
  })
  const run = async (args: string) => (await $.command.run({ command: 'cat', args,
    origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })).text ?? ''
  await run('show')
  expect(urls.length).toBe(0)
  expect(await run('weather London')).toContain('Choose in the Weather tab')
  expect(urls.length).toBe(1)
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 36, placement: 'dock', scroll: { offset: 0, bodyRows: 50 }, view: {} } })
  expect(await ui.find({ key: 'weather-city' })).toBeDefined()
  await ui.press({ key: 'weather-city-1' })
  expect(await ui.find({ type: 'Text', text: /Rain · 10°C/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /London, England, United Kingdom/ })).toBeDefined()
  expect(urls.at(-1)).toContain('latitude=51.5&longitude=-0.12')
  await ui.press({ key: 'weather-units' })
  expect(await ui.find({ type: 'Text', text: /50°F/ })).toBeDefined()
  await ui.press({ key: 'weather-refresh' })
  expect(urls.length).toBe(2)
  await ui.input({ key: 'weather-city', text: 'London, GB' })
  expect(urls.at(-1)).toContain('countryCode=GB')
  await ui.press({ key: 'weather-off' })
  expect(await ui.find({ type: 'Text', text: /Weather off/ })).toBeDefined()
  expect(await ui.find({ key: 'weather-city-1' })).toBeUndefined()
  expect(await run('weather at 999 0')).toContain('Usage:')
  expect(urls.length).toBe(3)
  await ui.unmount()
})

test('failed requests leave a usable seasonal yard and a helpful status', async ($, on) => {
  mock.clock(on, { now })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('http.fetch', () => { throw new Error('offline') })
  const result = await $.command.run({ command: 'cat', args: 'weather at 51.5 -0.12',
    origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  expect(result.text).toContain('weather unavailable')
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'desktop', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 58, placement: 'dock', scroll: { offset: 0, bodyRows: 50 }, view: {} } })
  expect(await ui.find({ type: 'Text', text: /Could not reach Open-Meteo/ })).toBeDefined()
  expect(await ui.find({ key: 'weather-system' })).toBeDefined()
  await ui.unmount()
})

test('device location opens the permission page and its callback updates the pane', async ($, on) => {
  const clock = mock.clock(on, { now })
  mock.store(on)
  mock.env(on, {})
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: {} }))
  const pending: string[] = []
  const server = { wake: null as (() => void) | null, isDone: false }
  on('process.spawn', async function* () {
    yield { stream: 'stdout' as const, text: '{"kind":"ready","port":5555}\n' }
    while (!server.isDone) {
      const line = pending.shift()
      if (line) yield { stream: 'stdout' as const, text: line }
      else await new Promise<void>(resolve => { server.wake = resolve })
    }
    return { value: { code: 0, signal: null } }
  })
  const opened: string[] = []
  on('process.run', ($, e) => {
    opened.push(e.argv.at(-1) ?? '')
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('http.fetch', ($, e) => ({ value: { status: 200, ok: true, headers: {},
    text: JSON.stringify(e.url.includes('api.open-meteo') ? current : { ok: true }) } }))
  const result = await $.command.run({ command: 'cat', args: 'weather system', origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 } })
  expect(result.text).toContain('Opened Cat Weather')
  expect(opened.at(-1)).toMatch(/^http:\/\/localhost:5555\/location\?t=[0-9a-f]{32}$/)
  pending.push('{"kind":"location","latitude":51.5074,"longitude":-0.1278}\n')
  server.wake?.()
  for (let i = 0; i < 8; i++) await clock.advance(1)
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 36, placement: 'dock', scroll: { offset: 0, bodyRows: 50 }, view: {} } })
  expect(await ui.find({ type: 'Text', text: /Device 51.51, -0.13/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Rain · 10°C/ })).toBeDefined()
  server.isDone = true
  server.wake?.()
  await ui.unmount()
})

test('a delayed weather response cannot restore a location after Off', async ($, on) => {
  mock.clock(on, { now })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  let markStarted!: () => void
  let release!: () => void
  const started = new Promise<void>(resolve => { markStarted = resolve })
  const waiting = new Promise<void>(resolve => { release = resolve })
  on('http.fetch', async () => {
    markStarted()
    await waiting
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(current) } }
  })
  const run = (args: string) => $.command.run({ command: 'cat', args, origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 } })
  const pending = run('weather at 51.5 -0.12')
  await started
  await run('weather off')
  release()
  await pending
  expect((await run('weather')).text).toContain('Weather off')
})
