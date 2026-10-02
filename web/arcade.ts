// The browser arcade: runs the same pure games as the rules, drawn through WebGL with glow and a CRT mode.
import { STEP, frame, offset, shakeOffset } from '../hooks/arcade/engine'
import type { Frame, Shake } from '../hooks/arcade/engine'
import type { Menu, Round } from '../hooks/arcade/bridge'
import type { Game, Input } from '../hooks/arcade/game'
import { gameOf } from '../hooks/arcade/games'
import { medalOf } from '../hooks/arcade/medals'
import { FLAVORS, css } from '../hooks/theme'
import type { Flavor } from '../hooks/theme'
import { createRenderer } from './render'
import type { Renderer } from './render'

type State = { menu: Menu | null; round: Round | null }

const W = 56
const H = 32
const OVER_HOLD_MS = 1200
const MAX_STEPS = 8
const KEYS: Record<string, string> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'return' }

const token = new URLSearchParams(location.search).get('t') ?? ''
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const post = (path: string, body: unknown) =>
  fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-arcade-token': token }, body: JSON.stringify(body) })

type Live = { game: Game<any>; round: Round; s: any; queue: Input[]; ms: number; tick: number; overMs: number; isSent: boolean }
let live: Live | null = null
let menu: Menu | null = null
let flavor: Flavor = FLAVORS.mocha
let renderer: Renderer | null = null
let last = 0
let acc = 0

const theme = (f: Flavor) => {
  flavor = f
  const root = document.documentElement.style
  for (const [name, c] of Object.entries({ base: f.base, mantle: f.mantle, crust: f.crust, text: f.text, sub: f.subtext0,
    muted: f.overlay1, surface: f.surface0, surface1: f.surface1, accent: f.mauve, title: f.lavender, ok: f.green, coin: f.yellow, bad: f.red })) {
    root.setProperty(`--${name}`, css(c))
  }
}

const show = (screen: 'menu' | 'play') => {
  $('menu').hidden = screen !== 'menu'
  $('play').hidden = screen !== 'play'
}

// The menu is rebuilt from the mod's state; text goes in as text, never as HTML.
const drawMenu = (m: Menu) => {
  $('cat').textContent = `${m.cat} · ${Math.round(m.energy)} energy`
  $('log').textContent = m.log
  $('rules').textContent = `Each round costs 10 energy. Medals pay coins and xp ${m.paidPlays}× per game a day; joy every time.`
  const list = $('games')
  list.replaceChildren(...m.games.map(g => {
    const card = document.createElement('button')
    card.className = g.id === m.featured ? 'card featured' : 'card'
    const name = document.createElement('strong')
    name.textContent = `${g.id === m.featured ? '★ ' : ''}${g.name}`
    const blurb = document.createElement('span')
    blurb.textContent = g.blurb
    const meta = document.createElement('small')
    meta.textContent = `best ${g.best} · ${g.left}/${m.paidPlays} paid left · medals ${g.medals.join('/')}${g.id === m.featured ? ' · 2× today' : ''}`
    const keys = document.createElement('small')
    keys.textContent = g.controls
    card.append(name, blurb, meta, keys)
    card.onclick = () => void post('/api/start', { game: g.id })
    return card
  }))
}

const start = (round: Round) => {
  const game = gameOf(round.game)
  if (!game) return
  live = { game, round, s: game.init(round.seed, round.mods, W, H), queue: [], ms: 0, tick: 0, overMs: 0, isSent: false }
  $('controls').textContent = `${game.controls} · Esc quits · G glow · C CRT`
  show('play')
  $('screen').focus()
}

const onState = (next: State) => {
  menu = next.menu
  if (menu) {
    theme(FLAVORS[menu.flavor] ?? FLAVORS.mocha)
    drawMenu(menu)
  }
  if (next.round && next.round.id !== live?.round.id) start(next.round)
  if (!next.round && live) {
    live = null
    show('menu')
  }
  if (!next.round && !live) show('menu')
}

const queue = (input: Input) => {
  if (live && !live.isSent && live.queue.length < 32) live.queue.push(input)
}

const pixel = (e: PointerEvent) => {
  const box = $('screen').getBoundingClientRect()
  return { x: ((e.clientX - box.left) / box.width) * W, y: ((e.clientY - box.top) / box.height) * H }
}

const loop = (now: number) => {
  requestAnimationFrame(loop)
  const dt = Math.min(0.25, (now - (last || now)) / 1000)
  last = now
  if (!live || !renderer) return
  const { game } = live
  const isOver = game.isOver(live.s)
  acc += dt
  let steps = 0
  // Fixed 60 Hz simulation, however fast the display runs.
  while (acc >= STEP && steps < MAX_STEPS) {
    live.s = game.step(live.s, STEP, steps === 0 && !isOver ? live.queue : [])
    if (steps === 0) live.queue = []
    acc -= STEP
    steps++
    live.tick++
    if (!isOver) live.ms += STEP * 1000
  }
  if (steps === MAX_STEPS) acc = 0
  if (isOver && !live.isSent) {
    live.overMs += dt * 1000
    if (live.overMs >= OVER_HOLD_MS) {
      live.isSent = true
      void post('/api/result', { game: game.id, score: game.score(live.s), ms: Math.round(live.ms) })
    }
  }
  let f: Frame = frame(W, H)
  game.draw(live.s, f, { f: flavor, genes: live.round.genes, tick: Math.floor(live.tick / 2) })
  const quake = (live.s as { shake?: Shake }).shake
  if (quake) {
    const d = shakeOffset(quake, live.tick)
    f = offset(f, d.x, d.y, flavor.base)
  }
  renderer.draw(f)
  const score = game.score(live.s)
  const medal = medalOf(game, score)
  const left = Math.max(0, Math.ceil(game.seconds - live.ms / 1000))
  $('hud').textContent = isOver
    ? `Round over · ${score} pts${medal ? ` · ${medal} medal!` : ''}${score > live.round.best ? ' · new best!' : ''}`
    : `${game.name} · ${score} pts · ${left}s · best ${live.round.best}${game.status ? ` · ${game.status(live.s)}` : ''}`
}

const boot = () => {
  renderer = createRenderer($<HTMLCanvasElement>('screen'), W, H)
  const canvas = $<HTMLCanvasElement>('screen')
  $('mode').textContent = renderer.kind === 'webgl' ? 'WebGL' : 'Canvas'
  const fit = () => {
    const scale = Math.max(4, Math.floor(Math.min(innerWidth * 0.94 / W, (innerHeight - 170) / H)))
    canvas.style.width = `${W * scale}px`
    canvas.style.height = `${H * scale}px`
    renderer?.resize(W * scale * devicePixelRatio, H * scale * devicePixelRatio)
  }
  addEventListener('resize', fit)
  fit()
  addEventListener('keydown', e => {
    if (!live) return
    if (e.key === 'Escape') {
      if (!live.isSent) {
        live.isSent = true
        void post('/api/quit', { game: live.game.id })
      }
      return
    }
    if (e.key === 'g' && !e.repeat) renderer?.toggle('glow')
    if (e.key === 'c' && !e.repeat) renderer?.toggle('crt')
    const key = KEYS[e.key] ?? (e.key === ' ' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : '')
    if (!key) return
    e.preventDefault()
    queue({ kind: 'key', key })
  })
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId)
    queue({ kind: 'down', ...pixel(e) })
  })
  canvas.addEventListener('pointermove', e => queue({ kind: 'move', ...pixel(e) }))
  canvas.addEventListener('pointerup', e => queue({ kind: 'up', ...pixel(e) }))
  const events = new EventSource(`/events?t=${encodeURIComponent(token)}`)
  events.addEventListener('state', e => onState(JSON.parse((e as MessageEvent).data) as State))
  events.onerror = () => { $('log').textContent = 'Lost the cats. Is Claude Code still running? Reopen from /cat.' }
  requestAnimationFrame(loop)
}

boot()
