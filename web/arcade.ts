// The browser arcade: runs the same pure games as the rules, drawn through WebGL with glow and a CRT mode.
import { STEP, offset, scaledFrame, shakeOffset } from '../hooks/arcade/engine'
import type { Frame, Shake } from '../hooks/arcade/engine'
import type { Menu, Round } from '../hooks/arcade/bridge'
import type { Game, Input } from '../hooks/arcade/game'
import { gameOf } from '../hooks/arcade/games'
import { medalOf } from '../hooks/arcade/medals'
import { FLAVORS, css } from '../hooks/theme'
import type { Flavor } from '../hooks/theme'
import { createRenderer } from './render'
import type { Renderer } from './render'
import { ART_H, ART_W, WORLD_H, WORLD_W, BACKGROUND_IDS, backgroundUrl } from '../hooks/art/backgrounds'
import type { Background } from '../hooks/art/backgrounds'
import type { GameId } from '../types'

type State = { menu: Menu | null; round: Round | null }

const W = WORLD_W
const H = WORLD_H
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
const backgrounds = new Map<string, Background>()
const pendingBackgrounds = new Set<string>()

const loadBackground = (id: GameId, name: Flavor['name']) => {
  const url = backgroundUrl(id, name)
  if (backgrounds.has(url) || pendingBackgrounds.has(url)) return
  pendingBackgrounds.add(url)
  const image = new Image()
  image.onload = () => {
    pendingBackgrounds.delete(url)
    if (image.naturalWidth !== ART_W || image.naturalHeight !== ART_H) return
    const canvas = document.createElement('canvas')
    canvas.width = ART_W; canvas.height = ART_H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(image, 0, 0)
    const rgba = ctx.getImageData(0, 0, ART_W, ART_H).data
    const px = new Uint32Array(ART_W * ART_H)
    for (let i = 0; i < px.length; i++) px[i] = ((rgba[i * 4] ?? 0) << 16) | ((rgba[i * 4 + 1] ?? 0) << 8) | (rgba[i * 4 + 2] ?? 0)
    backgrounds.set(url, { w: ART_W, h: ART_H, px })
  }
  image.onerror = () => pendingBackgrounds.delete(url)
  image.src = url
}

const theme = (f: Flavor) => {
  flavor = f
  for (const id of BACKGROUND_IDS) loadBackground(id, f.name)
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
    const preview = document.createElement('img')
    preview.className = 'preview'
    preview.alt = ''
    preview.src = backgroundUrl(g.id, m.flavor)
    preview.onerror = () => preview.remove()
    card.append(preview, name, blurb, meta, keys)
    card.onclick = () => void post('/api/start', { game: g.id })
    return card
  }))
}

const start = (round: Round) => {
  const game = gameOf(round.game)
  if (!game) return
  live = { game, round, s: game.init(round.seed, round.mods, W, H), queue: [], ms: 0, tick: 0, overMs: 0, isSent: false }
  $('controls').textContent = `${game.controls} · Esc quits${renderer?.kind === 'webgl' ? ' · G glow · C CRT' : ''}`
  show('play')
  $('screen').focus()
}

const onState = (next: State) => {
  menu = next.menu
  if (menu) {
    theme(FLAVORS[menu.flavor] ?? FLAVORS.mocha)
    drawMenu(menu)
    renderer?.set('glow', menu.prefs.glow)
    renderer?.set('crt', menu.prefs.crt)
  }
  if (next.round && next.round.id !== live?.round.id) start(next.round)
  if (!next.round && live) {
    live = null
    if (document.fullscreenElement === $('play')) void document.exitFullscreen()
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
  let f: Frame = scaledFrame(ART_W, ART_H, W, H)
  game.draw(live.s, f, { f: flavor, genes: live.round.genes, tick: Math.floor(live.tick / 2),
    background: backgrounds.get(backgroundUrl(game.id, flavor.name)) })
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
  renderer = createRenderer($<HTMLCanvasElement>('screen'), ART_W, ART_H,
    new URLSearchParams(location.search).get('canvas') === '1')
  const canvas = $<HTMLCanvasElement>('screen')
  $('mode').textContent = renderer.kind === 'webgl' ? 'WebGL' : 'Canvas'
  const fit = () => {
    const isFullscreen = document.fullscreenElement === $('play')
    const availableW = isFullscreen ? innerWidth : innerWidth * 0.94
    const availableH = isFullscreen ? innerHeight : innerHeight - 170
    const maximum = Math.max(1, Math.floor(Math.min(availableW / ART_W, availableH / ART_H)))
    const choice = $<HTMLSelectElement>('resolution').value
    const target = choice === 'fit' ? maximum : Number(choice)
    const scale = Math.min(6, maximum, target)
    canvas.style.width = `${ART_W * scale}px`
    canvas.style.height = `${ART_H * scale}px`
    renderer?.resize(ART_W * scale * devicePixelRatio, ART_H * scale * devicePixelRatio)
  }
  addEventListener('resize', fit)
  addEventListener('fullscreenchange', () => {
    $('fullscreen').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'
    fit()
  })
  $<HTMLSelectElement>('resolution').addEventListener('change', fit)
  $('fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void $('play').requestFullscreen()
  })
  fit()
  addEventListener('keydown', e => {
    if (!live) return
    if (e.key === 'Escape') {
      if (document.fullscreenElement) return
      if (!live.isSent) {
        live.isSent = true
        void post('/api/quit', { game: live.game.id })
      }
      return
    }
    // Display settings are kept by the mod, so they come back next session.
    if ((e.key === 'g' || e.key === 'c') && !e.repeat && renderer?.kind === 'webgl') {
      const effect = e.key === 'g' ? 'glow' : 'crt'
      renderer.set(effect, !renderer.isOn(effect))
      void post('/api/prefs', { glow: renderer.isOn('glow'), crt: renderer.isOn('crt') })
    }
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
