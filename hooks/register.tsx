import { read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Home, View, WeatherLocation, WeatherReading } from '../types'
import { arcadeUrl, browserArgv, newToken, parseLine, snapshotOf, splitLines } from './arcade/bridge'
import { GAMES, gameOf } from './arcade/games'
import { ENERGY_COST, PAID_PLAYS, featured, finishGame, playsLeft, quitGame, startGame } from './arcade/rewards'
import { catArt } from './art'
import { backupDir, backupName, inDir, parseBackup, pickBase, toBackup } from './backup'
import { buyCatnip, marketNow, seasonOf, sellCatnip, weekOf } from './calendar'
import { ACHIEVEMENTS, MILES_SHOP, buyWithMiles, settle, tasksFor, track } from './collection'
import { CRITTERS, critter, isAvailable, sell } from './critters'
import { act, activeCat, adopt, adoptPrice, adoptVisitor, bar, buyItem, checkIn, coinRate, donateCritter, giveGift,
  learnSkill, migrate, moodOf, newHome, nextCat, rename, respec, reward, stageName, switchTo, tick, welcomeBack,
  xpToNext } from './game'
import { CATCHPHRASE_LEVEL, DAILY_CAP, GIFTS, LEVELS, NICKNAME_LEVEL, PHOTO_LEVEL, dayOf, dialogue, friendLevel,
  levelName, toNextLevel } from './friends'
import type { Action } from './game'
import { PERSONALITY_INFO, describeGenes } from './genes'
import { COATS, COAT_REGISTRY, RARITIES, rarityBadge, rarityOf } from './adoption/registry'
import { revealedCat } from './adoption/state'
import { LOAN_SHARE, SHOP_CLOSE, SHOP_OPEN, baitOf, dailyStock, fmtCoins, furniture, isShopOpen, maxCats, payLoan, place,
  takeLoan, tierAt, tierOf } from './home'
import { PICTURE_SCALE, ROWS, frameCells, frameImage, sceneCols } from './scene'
import type { RgbaImage } from './scene'
import { shelterCells, shelterImage } from './scene/shelter'
import { CLIP_FOR, clipAsset, powershellArgv } from './sfx'
import type { Clip } from './sfx'
import { BRANCHES, FORM_LEVEL, SKILLS, branchPoints, canLearn, formOf, freePoints, rankOf, respecPrice } from './skills'
import type { Branch } from './skills'
import { RUN_MAX_COLS, RUN_ROWS, nextX, runFrame } from './runner'
import { catBadge, catHint, doneWord, pawPrefix, skinLevel, spinnerWord, walkFrame } from './skin'
import { FLAVORS, FLAVOR_NAMES, css, resolveFlavor, themeOptionFor, uiTokens } from './theme'
import type { Flavor } from './theme'
import type { SkinLevel } from './skin'
import { visibleTabs } from './ui/tabs'
import { goBack, initialRoute, navigate } from './ui/router'
import { parseCurrent } from './weather/conditions'
import { coordinates, forecastUrl, geocodingUrl, locationKey, locationUrl, parseLocations } from './weather/location'
import { acceptWeather, emptyWeather, liveWeather, refreshDue, setLocation, weatherSummary } from './weather/state'

const PANE = 'afk-cat'
const SCENE = 'scene'
const RUNNER = 'runner'
const SERVER = 'server/arcade.mjs'
const SERVER_START_MS = 10_000
const TICK_MS = 10_000
const FRAME_MS = 125
const STALL_MS = 2000
const homeRef = { plugin: 'afk-cat', key: 'home' } as const
const routeRef = { plugin: 'afk-cat', key: 'route' } as const
const catListRef = { plugin: 'afk-cat', key: 'isCatListOpen' } as const
const FORMS = ['ninja', 'royal', 'cloud', 'chonk']

// Latest home and scene width for the animation loop, which repaints without a render pass.
let latest: Home | null = null
let cols = 34
let frame = 0
// What the frame loop paints: the pane's view, element and last frame, whether it is mounted, and an in-flight guard.
const paint = { view: 'cat' as View, kind: 'raster' as SceneKind, last: '', isMounted: false, isBusy: false, busyAt: 0 }
// Set once an Image scene draws its text alt: this terminal shows no pictures, so the pane keeps to the Raster.
let isImageBlocked = false
// Claude Code's own theme row, read for the `auto` flavor.
let claudeTheme = 'dark'
let isSoundOn = true
let skin: SkinLevel = 'full'
// How the pane's scene draws: auto tries a picture and falls back to half-block cells.
let canvasMode: 'auto' | 'image' | 'text' = 'auto'
// The running-cat band above the prompt: its render instance, width and how it is drawn; the frame loop repaints it.
let band = { id: '', cols: 0, mode: 'off' as 'off' | 'raster' | 'text' }
let runX = 0
// Frame number until which the cat sprints; a tool call starts it.
let sprintUntil = 0
let flavorNow: (now: number) => Flavor = () => FLAVORS.mocha
// The browser arcade's server: started on first use, killed with the module; the token guards it.
const arcade = { port: 0, token: newToken(Math.random), starting: null as Promise<number> | null, pushed: '', isOpened: false }
let weatherJob: { key: string; task: Promise<void> } | null = null
let searchSerial = 0

// Plays a clip: $.audio.play where the host has a player, PowerShell on Windows.
const playClip = async ($: EngineInterface, clip: Clip) => {
  if ((await $.env.get('OS')) === 'Windows_NT') {
    await $.process.run(powershellArgv($.plugin.root, clip), { timeoutMs: 5000 })
    return
  }
  await $.audio.play({ asset: clipAsset(clip) })
}

// Applies a change to the household, then saves it so it survives restarts.
const change = async ($: EngineInterface, fn: (home: Home, now: number) => Home) => {
  const now = await $.clock.now()
  const stored = await $.store.get('home')
  let home!: Home
  let before!: Home
  await update($, homeRef, prev => {
    before = pickBase(stored, prev ?? newHome(now), now)
    return (home = { ...settle(fn(before, now), now), rev: before.rev + 1 })
  })
  latest = home
  const clip = home.effect && home.effect !== before.effect ? CLIP_FOR[home.effect.kind] : undefined
  if (clip && isSoundOn) void playClip($, clip).catch(() => undefined)
  for (const a of ACHIEVEMENTS) if (!(a.id in before.achievements) && a.id in home.achievements) $.ui.toast(`🏆 ${a.name}: ${a.text} (+${a.miles} miles)`)
  for (const t of tasksFor(now)) {
    if (!before.miles.done.includes(t.id) && home.miles.done.includes(t.id) && home.miles.day === before.miles.day) {
      $.ui.toast(`🐾 ${t.text} (+${t.miles} miles)`)
    }
  }
  await $.store.set('home', home)
  const cat = activeCat(home)
  $.ui.status(`🐱 ${cat.name} Lv${cat.level} ${moodOf(cat)} · ${fmtCoins(home.coins)}`)
  void pushArcade($, home, now)
  return home
}

// Sends the browser what changed: the menu and the round in progress.
const pushArcade = async ($: EngineInterface, home: Home, now: number) => {
  if (!arcade.port) return
  const body = JSON.stringify(snapshotOf(home, now, flavorNow(now).name))
  if (body === arcade.pushed) return
  arcade.pushed = body
  await $.http.fetch(`http://127.0.0.1:${arcade.port}/api/state`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-arcade-token': arcade.token }, body,
  }).catch(() => undefined)
}

// What the browser asked for, relayed by the server; every round is checked against the one the mod started.
const onArcadeLine = async ($: EngineInterface, line: string) => {
  const msg = parseLine(line)
  if (!msg || msg.kind === 'ready') return
  if (msg.kind === 'location') {
    const location = coordinates(msg.latitude, msg.longitude, 'device')
    if (!location) return
    searchSerial++
    await change($, h => ({ ...h, weather: setLocation(h.weather, location) }))
    $.ui.toast('Device location saved. Checking the weather…')
    void refreshWeather($)
    return
  }
  if (msg.kind === 'start') {
    await change($, (h, t) => startGame(h, msg.game, t))
    return
  }
  if (msg.kind === 'prefs') {
    await change($, h => ({ ...h, prefs: msg.prefs }))
    return
  }
  let wasOpen = false
  const home = await change($, (h, t) => {
    wasOpen = h.arcade.open?.game === msg.game
    return msg.kind === 'quit' ? quitGame(h) : finishGame(h, msg.game, msg.score, msg.ms, t, Math.random)
  })
  if (wasOpen && msg.kind === 'result') $.ui.toast(`🎮 ${home.log}`)
}

// Starts the server once and resolves its port; 0 when it could not start.
const ensureArcade = ($: EngineInterface): Promise<number> => {
  if (arcade.port) return Promise.resolve(arcade.port)
  if (arcade.starting) return arcade.starting
  const starting = new Promise<number>(resolve => {
    void (async () => {
      let rest = ''
      try {
        const root = $.plugin.root.replace(/[\\/]+$/, '')
        const child = $.process.spawn({ argv: ['node', `${root}/${SERVER}`], env: { ARCADE_TOKEN: arcade.token } })
        for await (const { stream, text } of child) {
          if (stream !== 'stdout') continue
          const split = splitLines(rest, text)
          rest = split.rest
          for (const line of split.lines) {
            const msg = parseLine(line)
            if (msg?.kind === 'ready') {
              arcade.port = msg.port
              resolve(msg.port)
            } else await onArcadeLine($, line)
          }
        }
      } catch {
        // Node is missing or the server crashed; the pane says so.
      }
      arcade.port = 0
      arcade.starting = null
      arcade.pushed = ''
      resolve(0)
    })()
    void $.clock.sleep(SERVER_START_MS).then(() => resolve(arcade.port), () => resolve(0))
  })
  arcade.starting = starting
  return starting
}

// Opens the arcade in the default browser, once a session unless asked again.
const openArcade = async ($: EngineInterface, isForced = false) => {
  const port = await ensureArcade($)
  if (!port) return false
  if (latest) {
    arcade.pushed = ''
    await pushArcade($, latest, await $.clock.now())
  }
  if (arcade.isOpened && !isForced) return true
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  for (const argv of browserArgv(isWindows, arcadeUrl(port, arcade.token))) {
    const ran = await $.process.run(argv, { timeoutMs: 5000 }).catch(() => null)
    if (ran && ran.exitCode === 0) break
  }
  arcade.isOpened = true
  $.ui.invalidate('ui.render')
  return true
}

const ACTIONS: { action: Action; label: string; hotkey: string }[] = [
  { action: 'feed', label: 'Feed 5c', hotkey: 'f' },
  { action: 'play', label: 'Play ▸', hotkey: 'p' },
  { action: 'pet', label: 'Pet', hotkey: 'e' },
  { action: 'nap', label: 'Nap/Wake', hotkey: 'n' },
]

const hourOf = (now: number) => new Date(now).getHours()

type SceneKind = 'raster' | 'image'
const sceneCellsOf = (home: Home, view: View, now: number, flavor: Flavor) => view === 'adopt'
  ? shelterCells(home, now, frame, flavor, cols) : frameCells({ home, now, tick: frame, hour: hourOf(now), flavor, cols })
const sceneImageOf = (home: Home, view: View, now: number, flavor: Flavor): RgbaImage => view === 'adopt'
  ? shelterImage(home, now, frame, flavor, cols, PICTURE_SCALE) : frameImage({ home, now, tick: frame, hour: hourOf(now), flavor, cols })
// A denied Image blit that names its alt means the terminal draws no pictures here.
const isAltDeny = (deny: string) => /\balt\b|placeholder/i.test(deny)

const routeTo = ($: EngineInterface, target: View | number) =>
  update($, routeRef, route => navigate(route ?? initialRoute(), target))

const weatherJson = async ($: EngineInterface, url: string): Promise<unknown> => {
  const response = await Promise.race([
    $.http.fetch(url),
    $.clock.sleep(12_000).then(() => { throw new Error('Weather request timed out') }),
  ])
  if (!response.ok) throw new Error('Weather service unavailable')
  return JSON.parse(response.text)
}

const refreshWeather = async ($: EngineInterface, force = false): Promise<void> => {
  const now = await $.clock.now()
  const state = latest?.weather
  if (!state?.location || !refreshDue(state, now, force)) return
  const location = state.location
  const key = locationKey(location)
  if (weatherJob?.key === key) {
    await weatherJob.task
    return refreshWeather($, force)
  }
  const task = (async () => {
    const home = await change($, h => locationKey(h.weather.location) === key
      ? { ...h, weather: { ...h.weather, attemptedAt: now } } : h)
    if (locationKey(home.weather.location) !== key) return
    let reading: WeatherReading | null = null
    let error: string | null = null
    try {
      reading = parseCurrent(await weatherJson($, forecastUrl(location)), await $.clock.now())
      if (!reading) error = 'Weather data was incomplete or out of date. Retrying in 5 minutes.'
    } catch {
      error = 'Could not reach Open-Meteo. Retrying in 5 minutes.'
    }
    await change($, h => h.weather.attemptedAt !== now ? h
      : { ...h, weather: acceptWeather(h.weather, key, reading, error) })
  })()
  weatherJob = { key, task }
  try { await task } finally { if (weatherJob?.task === task) weatherJob = null }
}

const selectWeather = async ($: EngineInterface, location: WeatherLocation) => {
  searchSerial++
  await change($, h => ({ ...h, weather: setLocation(h.weather, location) }))
  await refreshWeather($)
  return { text: `${latest?.weather.location?.label ?? location.label}\n${weatherSummary(latest!.weather, await $.clock.now())}` }
}

const searchWeather = async ($: EngineInterface, query: string): Promise<{ text: string }> => {
  const name = query.trim()
  if (name.length < 2 || name.length > 100) {
    const text = 'Enter a city name (2–100 characters), e.g. /cat weather London, GB.'
    await change($, h => ({ ...h, weather: { ...h.weather, candidates: [], notice: text } }))
    return { text }
  }
  const serial = ++searchSerial
  await change($, h => ({ ...h, weather: { ...h.weather, candidates: [], notice: `Searching for ${name}…` } }))
  let candidates: WeatherLocation[] = []
  let notice = ''
  try {
    candidates = parseLocations(await weatherJson($, geocodingUrl(name)))
    notice = candidates.length ? 'Choose your city below.' : 'No city found. Try a nearby city or use latitude and longitude.'
  } catch {
    notice = 'City search is unavailable. Try again, or use /cat weather at <latitude> <longitude>.'
  }
  if (serial !== searchSerial) return { text: 'Location search superseded by your newer choice.' }
  if (candidates.length === 1) return selectWeather($, candidates[0]!)
  await change($, h => ({ ...h, weather: { ...h.weather, candidates, notice } }))
  return { text: [notice, ...candidates.map((l, i) => `${i + 1}. ${l.label}`),
    candidates.length ? 'Choose in the Weather tab or /cat weather choose <number>.' : ''].filter(Boolean).join('\n') }
}

const openWeatherLocation = async ($: EngineInterface): Promise<{ text: string }> => {
  const port = await ensureArcade($)
  if (!port) return { text: 'Device location needs Node.js on your PATH. You can still enter a city in the Weather tab.' }
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  for (const argv of browserArgv(isWindows, locationUrl(port, arcade.token))) {
    const ran = await $.process.run(argv, { timeoutMs: 5000 }).catch(() => null)
    if (ran?.exitCode === 0) return { text: 'Opened Cat Weather. Choose “Use device location” and allow your browser to access location.' }
  }
  return { text: `Open ${locationUrl(port, arcade.token)} to use device location, or enter a city in the Weather tab.` }
}

const weatherCommand = async ($: EngineInterface, arg: string): Promise<{ text: string }> => {
  await change($, h => h)
  const [sub = '', ...rest] = arg.trim().split(/\s+/)
  if (!sub) return { text: `${weatherSummary(latest!.weather, await $.clock.now())}\nSet a city: /cat weather <city> · device: /cat weather system · stop: /cat weather off` }
  if (sub === 'off') {
    searchSerial++
    await change($, h => ({ ...h, weather: emptyWeather(h.weather.units) }))
    return { text: 'Weather disabled and the saved location cleared. The yard follows the seasons.' }
  }
  if (sub === 'system') return openWeatherLocation($)
  if (sub === 'refresh') {
    await refreshWeather($, true)
    return { text: weatherSummary(latest!.weather, await $.clock.now()) }
  }
  if (sub === 'units') {
    const units = rest[0]?.toLowerCase()
    if (units !== 'c' && units !== 'f') return { text: 'Usage: /cat weather units c|f' }
    await change($, h => ({ ...h, weather: { ...h.weather, units } }))
    return { text: weatherSummary(latest!.weather, await $.clock.now()) }
  }
  if (sub === 'choose') {
    const n = Number(rest[0])
    const location = Number.isInteger(n) && rest.length === 1 ? latest!.weather.candidates[n - 1] : undefined
    return location ? selectWeather($, location) : { text: 'Search for a city first, then /cat weather choose <number>.' }
  }
  if (sub === 'at') {
    const location = rest.length === 2 ? coordinates(Number(rest[0]), Number(rest[1])) : null
    return location ? selectWeather($, location) : { text: 'Usage: /cat weather at <latitude -90…90> <longitude -180…180>' }
  }
  return searchWeather($, arg)
}

const HELP = [
  '/cat (or /cat show) — open the pane',
  '/cat hide — close the pane (the cats keep earning)',
  '/cat shelter — open the adoption gacha',
  '/cat adopt [name] — roll and adopt a shelter cat',
  '/cat switch [name] — change the active cat (no name: the next one)',
  '/cat rename <name> — rename the active cat',
  '/cat reset — start over (wipes everything)',
  '/cat export [file] — save a backup (default: ~/.claude-kitten/backups/)',
  '/cat import <file> — load a backup (your current save is backed up first)',
  '/cat weather <city> — real weather; system for device location, off to clear, refresh to update',
  '/cat theme <latte|frappe|macchiato|mocha> — switch Claude Code to that Catppuccin theme',
  'In the pane: ‹ › tabs · q back · c a s h r b m g t visible tab shortcuts · f e n feed/pet/nap · p arcade · w cat list',
].join('\n')

// Sets Claude Code's own theme to one of this mod's Catppuccin themes, found in the theme row's options.
const themeCommand = async ($: EngineInterface, arg: string) => {
  const flavor = arg.trim().toLowerCase().replace(/é/g, 'e')
  if (!(FLAVOR_NAMES as readonly string[]).includes(flavor)) return { text: `Usage: /cat theme <${FLAVOR_NAMES.join('|')}>` }
  const row = (await $.config.list()).find(r => r.key === 'theme')
  const option = themeOptionFor(row?.options ?? [], flavor)
  if (!option) return { text: `Claude Code doesn't list a Catppuccin ${flavor} theme yet. Restart it once so the plugin's themes load, or pick one with /theme.` }
  const set = await $.config.set({ key: 'theme', value: option })
  if ('deny' in set && set.deny) return { text: `Couldn't change the theme: ${set.deny}` }
  await readTheme($)
  $.ui.invalidate('ui.render')
  return { text: `Theme set to ${option}.` }
}

const userHome = async ($: EngineInterface) => (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))

// /cat export writes a dated backup; /cat import checks one, backs up the current save, then loads it.
const backupCommand = async ($: EngineInterface, sub: 'export' | 'import', arg: string): Promise<{ text: string }> => {
  const dir = backupDir(await userHome($))
  const now = await $.clock.now()
  if (sub === 'export') {
    const home = await change($, h => h)
    const path = arg || inDir(dir, backupName(now))
    try {
      await $.fs.write(path, toBackup(home, now))
    } catch {
      return { text: `Could not write ${path}.` }
    }
    return { text: `Saved ${home.cats.map(c => c.name).join(', ')} and ${Math.floor(home.coins)}c to ${path}` }
  }
  if (!arg) return { text: 'Usage: /cat import <file>  (backups live in ' + dir + ')' }
  let text: string
  try {
    text = String(await $.fs.read(arg))
  } catch {
    return { text: `Could not read ${arg}.` }
  }
  const parsed = parseBackup(text, now)
  if ('error' in parsed) return { text: `Not imported: ${parsed.error}.` }
  const current = await change($, h => h)
  const safety = inDir(dir, backupName(now, '-before-import'))
  try {
    await $.fs.write(safety, toBackup(current, now))
  } catch {
    return { text: `Not imported: could not back up the current save to ${safety} first.` }
  }
  const home = await change($, () => ({ ...parsed.home, rev: current.rev, log: `Welcome back, ${parsed.home.cats.map(c => c.name).join(' and ')}!` }))
  await $.ui.open({ id: PANE, title: 'AFK Cat' })
  return { text: `Imported ${home.cats.length} cats and ${Math.floor(home.coins)}c. Your previous save is at ${safety}` }
}

const readTheme = async ($: EngineInterface) => {
  const row = (await $.config.list()).find(r => r.key === 'theme')
  claudeTheme = typeof row?.value === 'string' ? row.value : 'dark'
}

export const register: Register = (on, options) => {
  isSoundOn = options.sound !== false
  skin = skinLevel(options.skin)
  canvasMode = options.canvas === 'image' || options.canvas === 'text' ? options.canvas : 'auto'
  const flavorAt = (now: number) => resolveFlavor(String(options.flavor ?? 'auto'), claudeTheme, hourOf(now))
  flavorNow = flavorAt

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cat',
      description: 'Open your AFK cats (/cat hide, /cat shelter, /cat adopt [name], /cat switch <name>, /cat rename <name>, /cat weather <city>, /cat export, /cat import <file>, /cat help)',
    })
    await readTheme($)
    const saved = (await $.store.get('home')) ?? (await $.store.get('cat'))
    let bonus = 0
    const home = await change($, (_, t) => {
      const loaded = migrate(saved, t)
      const day = checkIn(tick(loaded, t), t)
      bonus = day.bonus
      return saved ? welcomeBack(loaded, day.home, t) : day.home
    })
    if (home.effect?.kind === 'welcome') $.ui.toast(home.log)
    if (bonus > 0) $.ui.toast(`Day ${home.streak} streak bonus: +${bonus}c`)
    void refreshWeather($)
    $.clock.every(60_000, () => { void refreshWeather($) })
    $.clock.every(TICK_MS, () => void readTheme($).then(() => change($, (h, t) => tick(h, t))))
    // Keeps the arcade server alive; it shuts itself down two minutes after the pings stop.
    $.clock.every(30_000, () => {
      if (!arcade.port) return
      void $.http.fetch(`http://127.0.0.1:${arcade.port}/api/ping`, { method: 'POST', headers: { 'x-arcade-token': arcade.token } })
        .catch(() => undefined)
    })
    $.clock.every(500, () => {
      if (band.mode === 'text') $.ui.invalidate('ui.render')
    })
    $.clock.every(FRAME_MS, async () => {
      if (!latest) return
      const now = await $.clock.now()
      // A frame still waiting on its blit holds the next one back, but never past STALL_MS.
      if (paint.isBusy && now - paint.busyAt < STALL_MS) return
      paint.isBusy = true
      paint.busyAt = now
      try {
        frame += 1
        const flavor = flavorAt(now)
        // Skips the scene while the pane is closed and when a frame would repaint the same cells.
        if (paint.isMounted && paint.kind === 'raster') {
          const cells = sceneCellsOf(latest, paint.view, now, flavor)
          if (cells !== paint.last) {
            paint.last = cells
            if ((await $.ui.blit({ requestId: PANE, key: SCENE, cells })).deny) paint.isMounted = false
          }
        } else if (paint.isMounted) {
          const source = sceneImageOf(latest, paint.view, now, flavor)
          if (source.rgba !== paint.last) {
            paint.last = source.rgba
            const { deny } = await $.ui.blit({ requestId: PANE, key: SCENE, source })
            if (deny) paint.isMounted = false
            if (deny && canvasMode === 'auto' && isAltDeny(deny)) {
              isImageBlocked = true
              $.ui.invalidate('ui.render')
            }
          }
        }
        if (band.mode !== 'raster') return
        const isSprint = frame < sprintUntil
        runX = nextX(runX, band.cols, isSprint)
        const run = { cat: activeCat(latest), flavor, tick: frame, x: runX, cols: band.cols, isSprint }
        if ((await $.ui.blit({ requestId: band.id, key: RUNNER, cells: runFrame(run) })).deny) band.mode = 'off'
      } finally {
        paint.isBusy = false
      }
    })
    return next(e)
  })

  on('command.run', { command: 'cat' }, async ($, e) => {
    const [sub = '', ...rest] = e.args.trim().split(/\s+/)
    const arg = rest.join(' ')
    if (sub === 'hide' || sub === 'close') {
      await $.ui.close({ id: PANE })
      return { text: 'The cats will keep earning while the pane is closed. /cat brings it back.' }
    }
    if (sub === 'export' || sub === 'import') return backupCommand($, sub, arg)
    if (sub === 'theme') return themeCommand($, arg)
    if (sub === 'weather') {
      await routeTo($, 'weather')
      const result = await weatherCommand($, arg)
      await $.ui.open({ id: PANE, title: 'AFK Cat' })
      return result
    }
    if (sub === 'shelter') {
      await routeTo($, 'adopt')
      await $.ui.open({ id: PANE, title: 'AFK Cat' })
      return { text: 'The adoption shelter is open. Choose Roll & adopt to welcome a mystery cat.' }
    }
    if (sub && !['show', 'open', 'rename', 'adopt', 'switch', 'reset'].includes(sub)) return { text: HELP }
    let home: Home
    if (sub === 'rename' && arg) home = await change($, h => rename(h, arg))
    else if (sub === 'adopt') {
      await routeTo($, 'adopt')
      home = await change($, (h, t) => adopt(h, t, Math.random, arg || undefined))
    }
    else if (sub === 'switch') home = await change($, h => (arg ? switchTo(h, arg) : nextCat(h)))
    else if (sub === 'reset') home = await change($, (_, t) => newHome(t))
    else home = await change($, h => h)
    await $.ui.open({ id: PANE, title: 'AFK Cat' })
    if (sub === 'switch') return { text: `${home.log} Cats: ${home.cats.map(c => c.name).join(', ')}.` }
    return { text: 'Your cats are in the pane.' }
  })

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const set = await next(e)
    await readTheme($)
    $.ui.invalidate('ui.render')
    return set
  })

  on('config.set', { key: 'skin' }, async ($, e, next) => {
    const set = await next(e)
    skin = skinLevel(e.value)
    $.ui.invalidate('ui.render')
    return set
  })

  on('config.set', { key: 'canvas' }, async ($, e, next) => {
    const set = await next(e)
    canvasMode = e.value === 'image' || e.value === 'text' ? e.value : 'auto'
    isImageBlocked = false
    $.ui.invalidate('ui.render')
    return set
  })

  on('tool.call', async ($, e, next) => {
    sprintUntil = frame + 16
    const ran = await next(e)
    void change($, (h, t) => track(reward(h, 1), 'tools', 1, t))
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    void change($, (h, t) => track({ ...reward(h, 3, 2, t), effect: { kind: 'coins', at: t } }, 'turns', 1, t))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const home = await read($, homeRef)
    if (!home) return <Text dimColor>Your cats are waking up…</Text>
    const now = await $.clock.now()
    const cat = activeCat(home)
    const mood = moodOf(cat)
    const flavor = flavorAt(now)
    const tone = uiTokens(flavor)
    cols = sceneCols(e.props.bodyColumns)
    const stat = (label: string, n: number) => (
      <Text color={n < 35 ? tone.bad : n < 55 ? tone.warn : tone.ok}>
        {label.padEnd(7)}{bar(n)} {String(Math.round(n)).padStart(3)}
      </Text>
    )
    const view = ((await read($, routeRef)) ?? initialRoute()).view
    const reveal = revealedCat(home)
    const isImage = 'Image' in ui && 'Raster' in ui && canvasMode !== 'text' && (canvasMode === 'image' || !isImageBlocked)
    const sceneImage = isImage ? sceneImageOf(home, view, now, flavor) : null
    const sceneCells = !isImage && 'Raster' in ui ? sceneCellsOf(home, view, now, flavor) : ''
    paint.view = view
    paint.kind = isImage ? 'image' : 'raster'
    paint.last = sceneImage?.rgba ?? sceneCells
    paint.isMounted = paint.last !== ''
    // What the picture shows, for screen readers and terminals that draw the alt instead.
    const sceneAlt = view !== 'adopt' ? `${cat.name} (${mood}) in the yard`
      : reveal ? `${reveal.name} at the adoption shelter` : 'A mystery parcel at the adoption shelter'
    const scene = sceneImage && 'Image' in ui
      ? <ui.Image key={SCENE} columns={cols} rows={ROWS} source={sceneImage} alt={sceneAlt} />
      : 'Raster' in ui ? <ui.Raster key={SCENE} columns={cols} rows={ROWS} cells={sceneCells} />
      : view === 'adopt' && !reveal ? <Text color={tone.accent}>{'   /─────\\\n   │  ?  │\n   └─────┘'}</Text>
        : <Box flexDirection="column">{catArt(mood, home.frame, formOf(cat)).map(line => <Text>{line}</Text>)}</Box>

    const isCatListOpen = (await read($, catListRef)) ?? false
    const tabs = (
      <Box key="tabs" flexDirection="row" flexWrap="nowrap" gap={1}>
        <Button key="tabs-back" plain hotkey="q" label="↶"
          onPress={() => update($, routeRef, route => goBack(route ?? initialRoute()))} />
        <Button key="tabs-prev" plain label="‹" onPress={() => routeTo($, -1)} />
        {visibleTabs(view, e.props.bodyColumns).map(t => (
          <Button key={`tab-${t.view}`} plain hotkey={t.hotkey} label={t.view === view ? `▸${t.label}` : t.label}
            variant={t.view === view ? 'primary' : undefined} onPress={() => routeTo($, t.view)} />
        ))}
        <Button key="tabs-next" plain label="›" onPress={() => routeTo($, 1)} />
      </Box>
    )

    const weatherRow = <Button key="weather-status" plain label={weatherSummary(home.weather, now)}
      onPress={() => routeTo($, 'weather')} />

    if (view === 'adopt') {
      const room = maxCats(home) - home.cats.length
      const price = adoptPrice(home)
      return <Box flexDirection="column">
        {tabs}
        {scene}
        <Text bold color={tone.title}>Adoption shelter</Text>
        <Text color={tone.coin}>{fmtCoins(home.coins)} · {home.cats.length}/{maxCats(home)} cats · {home.shelter.pulls} shelter pulls</Text>
        {reveal && <Box flexDirection="column">
          <Text bold color={css(flavor[RARITIES[rarityOf(reveal.genes)].color])}>{rarityBadge(reveal.genes)} · {reveal.name}</Text>
          <Text color={tone.muted}>{describeGenes(reveal.genes)}</Text>
          <Text color={tone.muted}>Last arrival · {home.shelter.last!.cost === 0 ? 'yard visitor' : `${home.shelter.last!.cost}c`}</Text>
          <Box>
            <Button key="shelter-meet" plain label={`Meet ${reveal.name}`} onPress={async () => {
              await change($, h => switchTo(h, reveal.id))
              await routeTo($, 'cat')
            }} />
            {room > 0 && home.coins >= price && <Button key="shelter-again" plain label={` Pull again · ${fmtCoins(price)}`}
              onPress={() => change($, (h, t) => adopt(h, t, Math.random))} />}
          </Box>
        </Box>}
        <Button key="adopt" plain label={room <= 0 ? 'House full · expand in Home'
          : home.coins < price ? `Need ${fmtCoins(price)} to roll & adopt` : `Roll & adopt · ${fmtCoins(price)}`}
          onPress={() => change($, (h, t) => adopt(h, t, Math.random))} />
        {room <= 0 && <Button key="shelter-expand" plain label="Go to Home" onPress={() => routeTo($, 'home')} />}
        <Text color={tone.muted}>One cat per pull. The fee is charged only when adoption succeeds. No cats are replaced.</Text>
        {home.shinyCharm && <Text color={tone.accent}>Shiny charm ready · your next shelter cat will sparkle.</Text>}
        <Text bold color={tone.title}>Rarity odds</Text>
        {Object.entries(RARITIES).map(([key, r]) => <Text key={`odds-${key}`} color={css(flavor[r.color])}>
          {r.label} {r.odds}% · {COATS.filter(coat => COAT_REGISTRY[coat].rarity === key).map(coat => COAT_REGISTRY[coat].label).join(', ')}
        </Text>)}
        <Text color={tone.muted}>Coats within each tier have equal odds. Markings and silhouettes vary independently. Shiny: 1/64, in any tier.</Text>
        <Text color={tone.muted}>Rarity is cosmetic. Personality keeps its usual bonuses.</Text>
        {home.visitors.length > 0 && <Text bold color={tone.title}>Yard visitors · free adoption</Text>}
        {home.visitors.map(v => <Box key={`shelter-${v.id}`} flexDirection="column">
          <Text color={css(flavor[RARITIES[rarityOf(v.genes)].color])}>{rarityBadge(v.genes)} · {v.name}</Text>
          <Text color={tone.muted}>{describeGenes(v.genes)}</Text>
          <Button key={`shelter-adopt-${v.id}`} plain label={`Welcome ${v.name}`} onPress={() => change($, (h, t) => adoptVisitor(h, v.id, t))} />
        </Box>)}
        <Text italic color={tone.log}>{home.log}</Text>
      </Box>
    }

    if (view === 'weather') {
      const reading = liveWeather(home.weather, now)
      return <Box flexDirection="column">
        {tabs}
        {scene}
        <Text bold color={tone.title}>Yard weather</Text>
        <Text color={tone.accent}>{weatherSummary(home.weather, now)}</Text>
        {home.weather.location && <Text color={tone.muted}>{home.weather.location.label}</Text>}
        {reading && <Text color={tone.muted}>Updated {Math.max(0, Math.floor((now - reading.fetchedAt) / 60_000))} min ago · refreshes every 15 minutes</Text>}
        {home.weather.error && <Text color={tone.warn}>{home.weather.error}{!reading ? ' Using the seasonal yard.' : ''}</Text>}
        {'Input' in ui ? <ui.Input key="weather-city" label="City" placeholder="London, GB" submitLabel="search"
          onSubmit={async value => { await searchWeather($, value) }} />
          : <Text>Choose a city: /cat weather London, GB</Text>}
        {home.weather.notice && <Text color={tone.muted}>{home.weather.notice}</Text>}
        {home.weather.candidates.map((location, i) => <Button key={`weather-city-${i + 1}`} plain
          label={`${i + 1}. ${location.label}`} onPress={async () => { await selectWeather($, location) }} />)}
        <Button key="weather-system" plain label="Use device location…" onPress={async () => {
          const result = await openWeatherLocation($)
          await change($, h => ({ ...h, weather: { ...h.weather, notice: result.text } }))
        }} />
        <Text color={tone.muted}>Opens your browser for location permission. The rounded location is saved with your cats and sent to Open-Meteo.</Text>
        <Box>
          <Button key="weather-refresh" label="Refresh" onPress={() => refreshWeather($, true)} />
          <Button key="weather-units" label={home.weather.units === 'c' ? 'Use °F' : 'Use °C'}
            onPress={() => change($, h => ({ ...h, weather: { ...h.weather, units: h.weather.units === 'c' ? 'f' : 'c' } }))} />
          <Button key="weather-off" label="Off" onPress={async () => { await weatherCommand($, 'off') }} />
        </Box>
        <Text color={tone.muted}>Coordinates: /cat weather at 51.50 -0.12</Text>
        <Text color={tone.muted}>Weather: <ui.Link href="https://open-meteo.com/">Open-Meteo</ui.Link> · city search: <ui.Link href="https://www.geonames.org/">GeoNames</ui.Link></Text>
      </Box>
    }
    const header = (
      <Box flexDirection="column">
        <Text bold color={tone.title}>
          {cat.name} · Lv {cat.level} {stageName(cat)} · {mood}
          {home.streak > 1 ? ` · 🔥${home.streak}d` : ''}
        </Text>
        <Text color={tone.muted}>{describeGenes(cat.genes)} — {PERSONALITY_INFO[cat.genes.personality]}</Text>
      </Box>
    )

    if (view === 'arcade') {
      const open = home.arcade.open
      const star = featured(now)
      const url = arcade.port ? arcadeUrl(arcade.port, arcade.token) : ''
      const play = (id: (typeof GAMES)[number]['id']) => async () => {
        await change($, (h, t) => startGame(h, id, t))
        await openArcade($)
      }
      return (
        <Box flexDirection="column">
          {tabs}
          <Text bold color={tone.title}>Arcade · {cat.name} plays · {Math.round(cat.energy)} energy</Text>
          <Text color={tone.muted}>
            Games run in your browser (WebGL). Each round costs {ENERGY_COST} energy; medals pay coins and xp {PAID_PLAYS}× per game a day.
          </Text>
          <Button key="arcade-open" hotkey="o" plain
            label={arcade.port ? '▸ Show the arcade in the browser again (o)' : '▸ Open the arcade in your browser (o)'}
            onPress={async () => {
              if (!(await openArcade($, true))) await change($, h => ({ ...h, log: 'The arcade needs Node.js on your PATH.' }))
            }} />
          {url ? <Text color={tone.muted}>{'   '}<ui.Link href={url}>{`localhost:${arcade.port}`}</ui.Link> · stays up while Claude Code runs</Text> : null}
          {open && (
            <Box flexDirection="column">
              <Text color={tone.ok}>▶ {cat.name} is playing {gameOf(open.game)?.name} in the browser.</Text>
              <Button key="arcade-quit" plain label="   Quit the round" onPress={() => change($, h => quitGame(h))} />
            </Box>
          )}
          {GAMES.map(g => (
            <Box flexDirection="column">
              <Button key={`game-${g.id}`} plain
                label={`${g.id === star ? '★' : '▸'} ${g.name} · best ${home.arcade.best[g.id] ?? 0} · ${playsLeft(home, g.id, now)}/${PAID_PLAYS} paid left${g.id === star ? ' · 2× today' : ''}`}
                onPress={play(g.id)} />
              <Text color={tone.muted}>{'   '}{g.blurb} ({g.controls}) · medals {g.medals.join('/')}</Text>
            </Box>
          ))}
          <Button key="quick-play" plain label="▸ Quick play · toss the yarn ball, no game"
            onPress={() => change($, (h, t) => act(h, 'play', t))} />
          <Text italic color={tone.log}>{home.log}</Text>
        </Box>
      )
    }

    if (view === 'book') {
      const date = new Date(now)
      const month = date.getMonth() + 1
      const pocket = Object.entries(home.pocket)
      return (
        <Box flexDirection="column">
          {tabs}
          <Text bold color={tone.title}>Museum · {home.museum.length}/{CRITTERS.length} donated</Text>
          <Text color={tone.muted}>
            {CRITTERS.map(c => (home.museum.includes(c.id) ? c.name : isAvailable(c, month, date.getHours()) ? '??? (out now)' : '???')).join(' · ')}
          </Text>
          <Text bold color={tone.accent}>Pocket (critters the cats brought home)</Text>
          {pocket.length === 0 && <Text color={tone.muted}>Empty. Cats find critters while you're away, by season and hour.</Text>}
          {pocket.map(([id, n]) => (
            <Box>
              <Text>{critter(id)?.name} ×{n} </Text>
              {!home.museum.includes(id) && (
                <Button key={`donate-${id}`} plain label="Donate" onPress={() => change($, (h, t) => donateCritter(h, id, t))} />
              )}
              <Button key={`sell-${id}`} plain label={` Sell ${critter(id)?.value}c`} onPress={() => change($, h => sell(h, id))} />
            </Box>
          ))}
          <Text bold color={tone.accent}>Cat book</Text>
          <Text>Coats {home.book.coats.length}/{COATS.length}: {COATS.map(c => (home.book.coats.includes(c) ? c : '???')).join(' · ')}</Text>
          <Text>Forms {home.book.forms.length}/4: {FORMS.map(f => (home.book.forms.includes(f) ? f : '???')).join(' · ')}</Text>
          <Text>Shinies: {home.book.shinies.join(', ') || 'none yet'} · strays met: {home.book.visitors.length}</Text>
          <Text>Photos: {home.book.photos.map(n => `📷 ${n}`).join('  ') || 'none yet (reach Best friend)'}</Text>
          <Text italic color={tone.log}>{home.log}</Text>
        </Box>
      )
    }

    if (view === 'miles') {
      const tasks = tasksFor(now)
      const counts = home.miles.day === dayOf(now) ? home.miles.counts : {}
      const done = home.miles.day === dayOf(now) ? home.miles.done : []
      return (
        <Box flexDirection="column">
          {tabs}
          <Text bold color={tone.title}>Paw Miles: {home.miles.total} · today's tasks reset at midnight</Text>
          {tasks.map(t => (
            <Text color={done.includes(t.id) ? tone.ok : undefined}>
              {done.includes(t.id) ? '✓' : '·'} {t.text} ({Math.min(counts[t.counter] ?? 0, t.goal)}/{t.goal}) · {t.miles} miles
            </Text>
          ))}
          <Text bold color={tone.accent}>
            Achievements {Object.keys(home.achievements).length}/{ACHIEVEMENTS.length}
          </Text>
          {ACHIEVEMENTS.map(a => (
            <Text color={a.id in home.achievements ? tone.ok : tone.muted}>
              {a.id in home.achievements ? '🏆' : '· '} {a.name} — {a.text} · {a.miles} miles
            </Text>
          ))}
          <Text bold color={tone.accent}>Miles shop</Text>
          {MILES_SHOP.map(item => (
            <Button key={`miles-${item.id}`} plain
              label={`${home.owned.includes(item.id) || (item.id === 'charm' && home.shinyCharm) ? '✓' : ' '} ${item.name} · ${item.cost} miles · ${item.text}`}
              onPress={() => change($, h => buyWithMiles(h, item.id))} />
          ))}
          <Text italic color={tone.log}>{home.log}</Text>
        </Box>
      )
    }

    if (view === 'friends') {
      const day = dayOf(now)
      return (
        <Box flexDirection="column">
          {tabs}
          {header}
          <Text italic color={tone.title}>{cat.name}: "{dialogue(cat, now, hourOf(now))}"</Text>
          {home.cats.map(c => {
            const next = toNextLevel(c.friendship)
            const points = c.daily.day === day ? c.daily.points : 0
            const gifted = c.daily.day === day && c.daily.gifted
            const level = friendLevel(c.friendship)
            return (
              <Box flexDirection="column">
                <Button key={`friend-${c.id}`} plain label={`${c.id === cat.id ? '▸' : ' '} ${c.name} · ${levelName(c.friendship)} (${level}/${LEVELS.length})`}
                  onPress={() => change($, h => switchTo(h, c.id))} />
                <Text color={tone.accent}>
                  {'   '}{next ? `${bar(((c.friendship - (LEVELS[level - 1]?.at ?? 0)) / (next.at - (LEVELS[level - 1]?.at ?? 0))) * 100, 10)} ${next.need} to go` : '★ best friends'}
                  {' · '}today {points}/{DAILY_CAP}{gifted ? ' · gifted ✓' : ''}
                </Text>
                <Text color={tone.muted}>
                  {'   '}{level >= NICKNAME_LEVEL ? '✓' : '·'} nickname  {level >= CATCHPHRASE_LEVEL ? '✓' : '·'} catchphrase  {level >= PHOTO_LEVEL ? '✓ photo' : '· photo'}
                </Text>
              </Box>
            )
          })}
          <Text bold color={tone.accent}>Give {cat.name} a gift (once a day; favorites count more)</Text>
          <Box flexDirection="column">
            {GIFTS.map(g => (
              <Button key={`gift-${g.id}`} plain label={`${g.name} · ${g.price}c`}
                onPress={() => change($, (h, t) => giveGift(h, g.id, t))} />
            ))}
          </Box>
          <Text italic color={tone.log}>{home.log}</Text>
        </Box>
      )
    }

    if (view === 'home') {
      const tier = tierOf(home)
      const next = tierAt(home.tier + 1)
      const hour = hourOf(now)
      const isOpen = isShopOpen(hour)
      const stock = dailyStock(now)
      const placed = new Set(Object.values(home.decor))
      const spare = home.owned.filter(id => !placed.has(id) && furniture(id) && tier.slots.includes(furniture(id)!.slot))
      return (
        <Box flexDirection="column">
          {tabs}
          {scene}
          {weatherRow}
          <Text bold color={tone.title}>
            {tier.name} · {home.cats.length}/{tier.maxCats} cats · {tier.slots.length} decor spots · Coins {fmtCoins(home.coins)}
          </Text>
          {home.loan > 0
            ? <Box>
                <Text color={tone.warn}>Tom Mew loan: {fmtCoins(Math.ceil(home.loan))} left ({LOAN_SHARE * 100}% of income pays it) </Text>
                <Button key="pay" plain label="Pay 100c" onPress={() => change($, h => payLoan(h, 100))} />
              </Box>
            : <Button key="loan" plain label={`Ask Tom Mew to build a ${next.name} · ${fmtCoins(next.loan)} loan · ${next.maxCats} cats`}
                onPress={() => change($, h => takeLoan(h))} />}
          <Text bold color={tone.accent}>Yard — strays drawn by your decor (pull {baitOf(home).total})</Text>
          {home.visitors.length === 0 && <Text color={tone.muted}>No strays right now. They come and go while you work.</Text>}
          {home.visitors.map(v => (
            <Box>
              <Text>{v.name} — {describeGenes(v.genes)} · leaves in {Math.max(0, Math.ceil((v.leavesAt - now) / 3_600_000))}h · gift {v.gift}c </Text>
              <Button key={`adopt-${v.id}`} plain label={`Adopt ${v.name}`} onPress={() => change($, (h, t) => adoptVisitor(h, v.id, t))} />
            </Box>
          ))}
          <Text bold color={tone.accent}>Placed</Text>
          <Text color={tone.muted}>{tier.slots.map(slot => `${slot}: ${furniture(home.decor[slot])?.name ?? '—'}`).join(' · ')}</Text>
          {spare.map(id => (
            <Button key={`place-${id}`} plain label={`Place ${furniture(id)?.name} (${furniture(id)?.slot})`}
              onPress={() => change($, h => place(h, id))} />
          ))}
          <Text bold color={tone.accent}>
            Nyan's shop · {isOpen ? `open until ${SHOP_CLOSE}:00 · new stock daily` : `closed · opens at ${SHOP_OPEN}:00`}
          </Text>
          {stock.map(item => (
            <Button key={`buy-${item.id}`} plain
              label={`${home.owned.includes(item.id) ? '✓' : ' '} ${item.name} · ${item.price}c · ${item.slot} · ${item.perk}`}
              onPress={() => change($, (h, t) => buyItem(h, item.id, t, hourOf(t)))} />
          ))}
          <Text bold color={tone.accent}>Catnip market · it's {seasonOf(new Date(now).getMonth() + 1)}</Text>
          {(() => {
            const market = marketNow(now, hour, isOpen)
            const held = home.catnip.week === weekOf(now) ? home.catnip.qty : 0
            const holding = held > 0 ? ` · you hold ${held} (paid ${home.catnip.paid}c each, spoils after Saturday)` : ''
            if (market.kind === 'buy') {
              return (
                <Box>
                  <Text>Daisy Meow sells catnip at {market.price}c a bundle{holding} </Text>
                  <Button key="catnip-10" plain label="Buy 10" onPress={() => change($, (h, t) => buyCatnip(h, 10, t, hourOf(t), isShopOpen(hourOf(t))))} />
                  <Button key="catnip-50" plain label=" Buy 50" onPress={() => change($, (h, t) => buyCatnip(h, 50, t, hourOf(t), isShopOpen(hourOf(t))))} />
                </Box>
              )
            }
            if (market.kind === 'sell') {
              return (
                <Box>
                  <Text>Nyan buys catnip for {market.price}c right now{holding} </Text>
                  {held > 0 && <Button key="catnip-sell" plain label="Sell all" onPress={() => change($, (h, t) => sellCatnip(h, t, hourOf(t), isShopOpen(hourOf(t))))} />}
                </Box>
              )
            }
            return <Text color={tone.muted}>{market.why}{holding}</Text>
          })()}
          <Text italic color={tone.log}>{home.log}</Text>
        </Box>
      )
    }

    if (view === 'skills') {
      const points = freePoints(cat)
      const form = formOf(cat)
      return (
        <Box flexDirection="column">
          {tabs}
          {header}
          <Text color={points > 0 ? tone.ok : tone.muted}>
            Skill points: {points} · one per level · {form ? `form: ${form}` : `evolves at Lv${FORM_LEVEL} by its strongest branch`}
          </Text>
          {(Object.keys(BRANCHES) as Branch[]).map(branch => (
            <Box flexDirection="column">
              <Text bold color={tone.accent}>
                {BRANCHES[branch].title} ({branchPoints(cat, branch)}) — {BRANCHES[branch].blurb} → {BRANCHES[branch].form}
              </Text>
              {SKILLS.filter(sk => sk.branch === branch).map(sk => {
                const rank = rankOf(cat, sk.id)
                const check = canLearn(cat, sk.id)
                const mark = rank >= sk.maxRank ? '■' : rank > 0 ? '▣' : check.ok ? '□' : '·'
                const why = !check.ok && check.reason !== 'maxed' && check.reason !== 'no skill points' ? ` (${check.reason})` : ''
                return (
                  <Button key={`skill-${sk.id}`} plain label={`${mark} ${sk.name} ${rank}/${sk.maxRank} · ${sk.perk}${why}`}
                    onPress={() => change($, h => learnSkill(h, sk.id))} />
                )
              })}
            </Box>
          ))}
          <Text italic color={tone.log}>{home.log}</Text>
          <Button key="respec" plain label={`Reset skills · ${respecPrice(cat)}c`}
            onPress={() => change($, (h, t) => respec(h, t))} />
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {tabs}
        {header}
        {scene}
        <Text italic color={tone.title}>{cat.name}: "{dialogue(cat, now, hourOf(now))}"</Text>
        <Button key="cat-list" hotkey="w" plain
          label={`${isCatListOpen ? '▾' : '▸'} Cats ${home.cats.length}/${maxCats(home)} · ${cat.name} (w)`}
          onPress={() => update($, catListRef, open => !open)} />
        {isCatListOpen && home.cats.map(c => (
          <Button key={`cat-${c.id}`} plain
            label={`   ${c.id === cat.id ? '●' : '○'} ${c.name} · ${RARITIES[rarityOf(c.genes)].label} · Lv${c.level} ${stageName(c)} · ${moodOf(c)}`}
            onPress={async () => {
              await change($, h => switchTo(h, c.id))
              await update($, catListRef, () => false)
            }} />
        ))}
        {isCatListOpen && home.cats.length < maxCats(home) && (
          <Text color={tone.muted}>{'   '}+ room for {maxCats(home) - home.cats.length} more · visit the Adopt tab</Text>
        )}
        {stat('Hunger', cat.hunger)}
        {stat('Joy', cat.joy)}
        {stat('Energy', cat.energy)}
        <Text color={tone.accent}>
          XP {bar((cat.xp / xpToNext(cat.level)) * 100, 10)} {cat.xp}/{xpToNext(cat.level)}
        </Text>
        <Text color={tone.coin}>
          Coins {fmtCoins(home.coins)} (+{coinRate(home).toFixed(1)}/min)
          {freePoints(cat) > 0 ? ` · ${freePoints(cat)} skill point${freePoints(cat) > 1 ? 's' : ''} to spend (s)` : ''}
        </Text>
        <Text italic color={tone.log}>{home.log}</Text>
        <Box>
          {ACTIONS.map(a => (
            <Button key={a.action} label={a.label} hotkey={a.hotkey}
              onPress={async () => {
                if (a.action !== 'play') return change($, (h, t) => act(h, a.action, t))
                await routeTo($, 'arcade')
                await openArcade($)
              }} />
          ))}
        </Box>
      </Box>
    )
  })

  // Cat skin: redraws Claude Code's own spinner, turn line, hint, band and tool rows.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (skin === 'off') return next(e)
    return next({ ...e, props: { ...e.props, word: spinnerWord(e.props.mode, e.props.word) } })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    if (skin === 'off') return next(e)
    return next({ ...e, props: { ...e.props, word: doneWord(e.props.word) } })
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (skin === 'off' || e.props.isDraft) return next(e)
    const badge = catBadge(await read($, homeRef), flavorAt(await $.clock.now()))
    if (!badge.length) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        {await next(e)}
        <Text key="cat-badge"> {badge.map((s, i) => <Text key={`cat-badge-${i}`} color={s.color} bold={s.isBold}>{s.text}</Text>)}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    band.mode = 'off'
    if (skin !== 'full' || e.props.hasSurvey || !e.props.isWorking) return next(e)
    const ui = $.ui.resolve(e)
    const now = await $.clock.now()
    const width = Math.min(e.props.bodyColumns, RUN_MAX_COLS)
    if ('Raster' in ui && latest && width >= 30 && e.props.maxRows >= RUN_ROWS) {
      band = { id: e.requestId, cols: width, mode: 'raster' }
      const run = { cat: activeCat(latest), flavor: flavorAt(now), tick: frame, x: runX, cols: width, isSprint: frame < sprintUntil }
      return <ui.Raster key={RUNNER} columns={width} rows={RUN_ROWS} cells={runFrame(run)} />
    }
    band.mode = 'text'
    return <ui.Text color={uiTokens(flavorAt(now)).accent}>{walkFrame(frame, e.props.bodyColumns)}</ui.Text>
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (skin !== 'full') return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const tone = uiTokens(flavorAt(await $.clock.now()))
    return (
      <Box>
        <Text color={tone.accent}>{pawPrefix(e.props.tool)} </Text>
        {await next(e)}
      </Box>
    )
  })

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
    if (skin !== 'full' || e.props.kind !== 'background_hint') return next(e)
    return next({ ...e, props: { ...e.props, hint: catHint(e.props.hint) } })
  })
}
