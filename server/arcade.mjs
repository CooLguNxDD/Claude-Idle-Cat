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
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/arcade.js': ['arcade.js', 'text/javascript; charset=utf-8'],
  '/arcade.css': ['arcade.css', 'text/css; charset=utf-8'],
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
let lastPing = Date.now()
const listeners = new Set()

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

const readBody = req => new Promise((resolve, reject) => {
  let text = ''
  req.setEncoding('utf8')
  req.on('data', chunk => {
    text += chunk
    if (text.length > MAX_BODY) reject(new Error('too large'))
  })
  req.on('end', () => {
    try { resolve(text ? JSON.parse(text) : {}) } catch (e) { reject(e) }
  })
  req.on('error', reject)
})

const broadcast = () => {
  for (const res of listeners) res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`)
}

// The browser forwards only what a player can do; the mod checks every round against what it started.
const FROM_BROWSER = {
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
    if (url.pathname === '/' && token !== TOKEN) return send(res, 403, 'Open the arcade from the cat pane.', 'text/plain')
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
  if (req.method !== 'POST') return send(res, 404, { error: 'not found' })
  let body
  try { body = await readBody(req) } catch { return send(res, 400, { error: 'body' }) }
  if (url.pathname === '/api/state') {
    state = { menu: body.menu ?? null, round: body.round ?? null }
    lastPing = Date.now()
    broadcast()
    return send(res, 200, { ok: true })
  }
  if (url.pathname === '/api/ping') {
    lastPing = Date.now()
    return send(res, 200, { ok: true, viewers: listeners.size })
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
}, 15_000).unref()
