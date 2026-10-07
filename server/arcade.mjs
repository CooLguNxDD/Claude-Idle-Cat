// The arcade's local web server: serves the WebGL arcade on 127.0.0.1 and relays rounds to and from the mod.
// The mod reads one JSON object per stdout line; it pushes state here over HTTP with the session token.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TOKEN = process.env.ARCADE_TOKEN ?? ''
const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), 'public')
const IDLE_MS = Number(process.env.ARCADE_IDLE_MS ?? 120_000)
const MAX_BODY = 8192
const PANE_MAX_BODY = 700_000
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/arcade.js': ['arcade.js', 'text/javascript; charset=utf-8'],
  '/arcade.css': ['arcade.css', 'text/css; charset=utf-8'],
  '/location': ['location.html', 'text/html; charset=utf-8'],
  '/location.js': ['location.js', 'text/javascript; charset=utf-8'],
  '/location.css': ['location.css', 'text/css; charset=utf-8'],
  '/pane': ['pane.html', 'text/html; charset=utf-8'],
  '/pane.js': ['pane.js', 'text/javascript; charset=utf-8'],
  '/pane.css': ['pane.css', 'text/css; charset=utf-8'],
}
const GAME_IDS = new Set(['dash', 'catch', 'laser', 'whack', 'tank', 'lanes'])
const FLAVORS = new Set(['latte', 'frappe', 'macchiato', 'mocha'])
const artFile = pathname => {
  const match = /^\/art\/(dash|catch|laser|whack|tank|lanes)\.(latte|frappe|macchiato|mocha)\.png$/.exec(pathname)
  return match && GAME_IDS.has(match[1]) && FLAVORS.has(match[2]) ? `art/${match[1]}.${match[2]}.png` : null
}

if (TOKEN.length < 16) {
  process.stderr.write('ARCADE_TOKEN is missing\n')
  process.exit(2)
}

const say = message => process.stdout.write(`${JSON.stringify(message)}\n`)
let state = { menu: null, round: null }
let paneFrame = null
let lastPing = Date.now()
const listeners = new Set()
const paneListeners = new Set()

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

const readBody = (req, max = MAX_BODY) => new Promise((resolve, reject) => {
  let text = ''
  req.setEncoding('utf8')
  req.on('data', chunk => {
    text += chunk
    if (text.length > max) reject(new Error('too large'))
  })
  req.on('end', () => {
    try { resolve(text ? JSON.parse(text) : {}) } catch (e) { reject(e) }
  })
  req.on('error', reject)
})

const broadcast = () => {
  for (const res of listeners) res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`)
}

const paneBytes = (width, height) => Math.ceil(width * height * 4 / 3) * 4
const paneFrameOf = body => {
  if (!body || typeof body.rgba !== 'string' || !Number.isInteger(body.width) || !Number.isInteger(body.height)) return null
  if (body.width < 1 || body.height < 1 || body.width > 512 || body.height > 256) return null
  if (body.rgba.length !== paneBytes(body.width, body.height) || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.rgba)) return null
  return { rgba: body.rgba, width: body.width, height: body.height }
}
const broadcastPane = () => {
  if (!paneFrame) return
  const chunk = `event: frame\ndata: ${JSON.stringify(paneFrame)}\n\n`
  for (const res of paneListeners) res.write(chunk)
}

// The browser forwards only what a player can do; the mod checks every round against what it started.
const FROM_BROWSER = {
  '/api/location': b => typeof b.latitude === 'number' && Number.isFinite(b.latitude) && Math.abs(b.latitude) <= 90
    && typeof b.longitude === 'number' && Number.isFinite(b.longitude) && Math.abs(b.longitude) <= 180
    && { kind: 'location', latitude: Math.round(b.latitude * 100) / 100, longitude: Math.round(b.longitude * 100) / 100 },
  '/api/start': b => typeof b.game === 'string' && { kind: 'start', game: b.game },
  '/api/result': b => typeof b.game === 'string' && Number.isFinite(b.score) && Number.isFinite(b.ms)
    && { kind: 'result', game: b.game, score: b.score, ms: b.ms },
  '/api/quit': b => typeof b.game === 'string' && { kind: 'quit', game: b.game },
  '/api/prefs': b => typeof b.glow === 'boolean' && typeof b.crt === 'boolean' && { kind: 'prefs', glow: b.glow, crt: b.crt },
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const host = (req.headers.host ?? '').split(':')[0]
  // Only loopback names: a DNS-rebinding page cannot reach this server under its own host name.
  if (host !== '127.0.0.1' && host !== 'localhost') return send(res, 421, { error: 'host' })
  const token = req.headers['x-arcade-token'] ?? url.searchParams.get('t')
  const png = artFile(url.pathname)
  const asset = STATIC[url.pathname] ?? (png ? [png, 'image/png'] : null)
  if (req.method === 'GET' && asset) {
    if ((url.pathname === '/' || url.pathname === '/location' || url.pathname === '/pane') && token !== TOKEN)
      return send(res, 403, 'Open this page from the cat pane.', 'text/plain')
    try {
      return send(res, 200, await readFile(join(PUBLIC, asset[0]), asset[1] === 'image/png' ? undefined : 'utf8'), asset[1])
    } catch {
      return send(res, 500, 'The arcade bundle is missing: run node tools/build-web.mjs', 'text/plain')
    }
  }
  if (token !== TOKEN) return send(res, 403, { error: 'token' })
  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' })
    res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`)
    listeners.add(res)
    req.on('close', () => listeners.delete(res))
    return
  }
  if (req.method === 'GET' && url.pathname === '/pane/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' })
    res.write(`event: frame\ndata: ${JSON.stringify(paneFrame ?? { rgba: '', width: 0, height: 0 })}\n\n`)
    paneListeners.add(res)
    req.on('close', () => paneListeners.delete(res))
    return
  }
  if (req.method !== 'POST') return send(res, 404, { error: 'not found' })
  let body
  try { body = await readBody(req, url.pathname === '/api/pane' ? PANE_MAX_BODY : MAX_BODY) } catch { return send(res, 400, { error: 'body' }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'body' })
  if (url.pathname === '/api/state') {
    state = { menu: body.menu ?? null, round: body.round ?? null }
    lastPing = Date.now()
    broadcast()
    return send(res, 200, { ok: true })
  }
  if (url.pathname === '/api/pane') {
    const frame = paneFrameOf(body)
    if (!frame) return send(res, 400, { error: 'frame' })
    paneFrame = frame
    lastPing = Date.now()
    broadcastPane()
    return send(res, 200, { ok: true, viewers: paneListeners.size })
  }
  if (url.pathname === '/api/ping') {
    lastPing = Date.now()
    return send(res, 200, { ok: true, viewers: listeners.size, paneViewers: paneListeners.size })
  }
  const relay = FROM_BROWSER[url.pathname]
  const message = relay && relay(body)
  if (!message) return send(res, 400, { error: 'request' })
  say(message)
  return send(res, 200, { ok: true })
})

server.listen(Number(process.env.ARCADE_PORT ?? 0), '127.0.0.1', () => say({ kind: 'ready', port: server.address().port }))
// The mod pings while its session lives; without it the server shuts itself down.
setInterval(() => {
  if (Date.now() - lastPing > IDLE_MS) process.exit(0)
  for (const res of listeners) res.write(': keep-alive\n\n')
  for (const res of paneListeners) res.write(': keep-alive\n\n')
}, 15_000).unref()
