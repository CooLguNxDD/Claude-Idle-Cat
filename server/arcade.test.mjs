import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'

test('location page and callbacks keep the local token and coordinate boundaries', { timeout: 15_000 }, async () => {
  const token = 'weather-test-token-1234567890'
  const child = spawn(process.execPath, [fileURLToPath(new URL('./arcade.mjs', import.meta.url))],
    { env: { ...process.env, ARCADE_TOKEN: token, ARCADE_PORT: '0', ARCADE_IDLE_MS: '30000' }, windowsHide: true })
  const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]()
  try {
    const ready = JSON.parse((await lines.next()).value)
    const origin = `http://127.0.0.1:${ready.port}`
    assert.equal((await fetch(`${origin}/location`)).status, 403)
    const page = await fetch(`${origin}/location?t=${token}`)
    assert.equal(page.status, 200)
    assert.match(await page.text(), /Use device location/)
    for (const asset of ['location.js', 'location.css']) assert.equal((await fetch(`${origin}/${asset}`)).status, 200)
    const post = (body, key = token) => fetch(`${origin}/api/location`, { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-arcade-token': key }, body: JSON.stringify(body) })
    assert.equal((await post({ latitude: 51.5, longitude: 0 }, 'wrong')).status, 403)
    for (const body of [null, [], { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 },
      { latitude: '51.5', longitude: 0 }]) assert.equal((await post(body)).status, 400)
    assert.equal((await post({ latitude: 51.5074, longitude: -0.1278 })).status, 200)
    assert.deepEqual(JSON.parse((await lines.next()).value), { kind: 'location', latitude: 51.51, longitude: -0.13 })
    assert.equal((await fetch(`${origin}/art/not-registered.png?t=${token}`)).status, 404)
  } finally {
    child.kill()
    await lines.return()
  }
})

const locationPage = async (geolocation, fetch) => {
  const elements = { locate: { disabled: false, textContent: '', addEventListener: (_, handler) => { elements.click = handler } },
    status: { textContent: '' }, click: null }
  runInNewContext(await readFile(new URL('./public/location.js', import.meta.url), 'utf8'), {
    document: { getElementById: id => elements[id] }, navigator: { geolocation }, fetch,
    location: { search: '?t=test-token' }, URLSearchParams,
  })
  return elements
}

test('browser location asks on click, rounds before sending, and handles denial', async () => {
  const sent = []
  let requests = 0
  const page = await locationPage({ getCurrentPosition: success => {
    requests++
    success({ coords: { latitude: 51.5074, longitude: -0.1278 } })
  } }, async (_, init) => { sent.push(JSON.parse(init.body)); return { ok: true } })
  assert.equal(requests, 0)
  await page.click()
  assert.deepEqual(sent, [{ latitude: 51.51, longitude: -0.13 }])
  assert.match(page.status.textContent, /Saved 51.51, -0.13/)
  assert.equal(page.locate.disabled, false)
  const denied = await locationPage({ getCurrentPosition: (_, fail) => fail({ code: 1 }) }, () => assert.fail('no fetch after denial'))
  await denied.click()
  assert.match(denied.status.textContent, /permission was denied/)
  const absent = await locationPage(undefined, () => assert.fail('no fetch without geolocation'))
  await absent.click()
  assert.match(absent.status.textContent, /cannot provide location/)
  const unavailable = await locationPage({ getCurrentPosition: (_, fail) => fail({ code: 2 }) }, () => assert.fail('no fetch without location'))
  await unavailable.click()
  assert.match(unavailable.status.textContent, /location is unavailable/)
})
