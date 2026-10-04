import { catRef, wordsOf } from './commands'
import { catsAtHome, isAway } from './away'
import { claim, canSend, finishExpeditions, lootOf, readyRuns, resumeExpeditions, send, slotsOf } from './expeditions'
import { claimQuest, questsFor, questState } from './quests'
import { activeEvents, exchange } from './events'
import { canCraft, costText, craft, drinkTea } from './shop'
import { addBond, bondKey, partnerOf, pickInteraction, startPair, stepPair } from './pair'
import type { PairRun } from './pair'
import { pickReaction, rememberReaction } from './reactions'
import type { ReactionMemory, ReactionMode } from './reactions'
import { signalsOf, turnSignal } from './reactions/signals'
import type { Signal } from './content/types'
import { isContentAvailable } from './content/availability'
import { unlockHint } from './content/types'
import { skillTotals } from './skills'
import { homeMods } from './home'
import { read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Cat, Home, View, WeatherLocation, WeatherReading } from '../types'
import { arcadeUrl, browserArgv, newToken, parseLine, snapshotOf, splitLines } from './arcade/bridge'
import { GAMES, gameOf } from './arcade/games'
import { ENERGY_COST, PAID_PLAYS, featured, finishGame, playsLeft, quitGame, startGame } from './arcade/rewards'
import { catArt } from './art'
import { backupDir, backupName, inDir, parseBackup, pickBase, toBackup } from './backup'
import { buyCatnip, marketNow, seasonOf, sellCatnip, weekOf } from './calendar'
import { ACHIEVEMENTS, MILES_SHOP, buyWithMiles, settle, tasksFor, track } from './collection'
import { CRITTERS, critter, isAvailable, sell } from './critters'
import { act, activeCat, adopt, adoptPrice, adoptVisitor, bar, buyItem, checkIn, coinRate, donateCritter, giveGift, idleRate,
  learnSkill, migrate, moodOf, newHome, nextCat, rename, respec, reward, rollToolPay, spendPay, stageName, switchTo,
  tick, tickTally, TOOL_CHANCE, activeMinutes, activePay, rampOf, toolPay, welcomeBack, xpToNext } from './game'
import { CATCHPHRASE_LEVEL, DAILY_CAP, GIFTS, LEVELS, NICKNAME_LEVEL, PHOTO_LEVEL, dayOf, dialogue, friendLevel,
  levelName, toNextLevel } from './friends'
import type { Action } from './game'
import { PERSONALITY_INFO, describeGenes } from './genes'
import { COATS, RARITIES, availableBreeds, breedOf, rarityBadge, rarityOf } from './adoption/registry'
import { revealedCat } from './adoption/state'
import { LOAN_SHARE, SHOP_CLOSE, SHOP_OPEN, baitOf, dailyStock, fmtCoins, furniture, isShopOpen, maxCats, payLoan, place,
  takeLoan, tierAt, tierOf } from './home'
import { PICTURE_SCALE, ROWS, frameCells, frameImage, sceneCols, yardCols } from './scene'
import type { RgbaImage } from './scene'
import { CLASSIC_X } from './scene/cats'
import { forceMove, motionCtxOf, startMotion, stepMotion } from './motion'
import { followCam, panCam } from './camera'
import type { Camera } from './camera'
import { buyWorld, canBuyWorld, isWorldOwned, setWorld } from './world'
import { think } from './brain'
import { BOWL_CAP, fillBowl } from './bowl'
import { BEHAVIORS, WORLDS, EXPEDITIONS, SHOP, INTERACTIONS } from './content'
import { DESIGN } from './scene/fine/draw'
import { seeded } from './rng'
import type { Rng } from './rng'
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
// Where the active cat is in the yard and what it is doing; kept in memory, never in the save.
let motion = startMotion(CLASSIC_X)
let motionCatId = ''
let pairRun: PairRun | null = null
let intentKey = ''
let reactionMemory: ReactionMemory = {}
let reactionMode: ReactionMode = 'on'
let reactionUntil = 0
let partySelection: string[] = []
let gearSelection: string[] = []
let expeditionChoice = 0
let partyCursor = 0
const SETTING_CHOICES: Record<string, readonly string[]> = {
  'afk-cat.flavor': ['auto', 'daycycle', 'latte', 'frappe', 'macchiato', 'mocha'],
  'afk-cat.skin': ['full', 'light', 'off'],
  'afk-cat.canvas': ['auto', 'image', 'text'],
  'afk-cat.reactions': ['on', 'quiet', 'off'],
}
const notifiedRuns = new Set<string>()
let motionRng: Rng | null = null
// The pane's window onto the yard; it follows the cat until a pan holds it for a while.
let camera: Camera = { x: 0, manualUntil: 0 }
// What the frame loop paints: the pane's view, element and last frame, whether it is mounted, and an in-flight guard.
const paint = { view: 'cat' as View, kind: 'raster' as SceneKind, last: '', isMounted: false, isBusy: false, busyAt: 0 }
// The brain waits on the active cat while its on-screen move is still walking or playing out.
const isOnScreen = (cat: Cat) => {
  const behavior = cat.intent ? BEHAVIORS.find(b => b.id === cat.intent!.id) : undefined
  return paint.isMounted && !!behavior && !behavior.partner && cat.id === motionCatId && motion.move === behavior.move
    && (motion.stage === 'go' || motion.left > 0)
}
// Set once an Image scene draws its text alt: this terminal shows no pictures, so the pane keeps to the Raster.
let isImageBlocked = false
// Claude Code's own theme row, read for the `auto` flavor.
let claudeTheme = 'dark'
let flavorSetting = 'auto'
let isSoundOn = true
let skin: SkinLevel = 'full'
// How the pane's scene draws: auto tries a picture and falls back to half-block cells.
let canvasMode: 'auto' | 'image' | 'text' = 'auto'
// The running-cat band above the prompt: its render instance, width and how it is drawn; the frame loop repaints it.
let band = { id: '', cols: 0, mode: 'off' as 'off' | 'raster' | 'text' }
let runX = 0
// Frame number until which the cat sprints; a tool call starts it.
let sprintUntil = 0
// Session spend (US dollars) already paid out; unknown until a usage read works, so earlier spend is never paid.
let paidUsd: number | undefined
// Coins gained this prompt and this chat; the prompt resets on turn.start, both on session.start.
const earned = { prompt: 0, chat: 0 }
// Active minutes this chat has run; Claude's pay ramps up with it.
let chatMinutes = 0
// Active minutes from replies whose reward never landed; the next reply pays them.
let owedMinutes = 0
// Claude's rewards run one at a time, in order, so a reply's toast sees every tool tip before it.
let rewards: Promise<unknown> = Promise.resolve()
const queue = (job: () => Promise<unknown>) => (rewards = rewards.then(job).catch(() => undefined))
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
// `deducted` reports coins fn spent on its own, so they still count as earned; `onApplied` runs once the change lands.
const change = async ($: EngineInterface, fn: (home: Home, now: number) => Home, deducted?: () => number,
  onApplied?: () => void) => {
  const now = await $.clock.now()
  const stored = await $.store.get('home')
  let home!: Home
  let before!: Home
  await update($, homeRef, prev => {
    before = pickBase(stored, prev ?? newHome(now), now)
    return (home = { ...settle(fn(before, now), now), rev: before.rev + 1 })
  })
  onApplied?.()
  latest = home
  const gain = Math.max(0, home.coins - before.coins + (deducted?.() ?? 0))
  earned.prompt += gain
  earned.chat += gain
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
    await change($, prev => ({ ...prev, weather: setLocation(prev.weather, location) }))
    $.ui.toast('Device location saved. Checking the weather…')
    void refreshWeather($)
    return
  }
  if (msg.kind === 'start') {
    await change($, (prev, t) => startGame(prev, msg.game, t))
    return
  }
  if (msg.kind === 'prefs') {
    await change($, prev => ({ ...prev, prefs: msg.prefs }))
    return
  }
  let wasOpen = false
  const home = await change($, (prev, t) => {
    wasOpen = prev.arcade.open?.game === msg.game
    return msg.kind === 'quit' ? quitGame(prev) : finishGame(prev, msg.game, msg.score, msg.ms, t, Math.random)
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

const ACTIONS: { id: string; label: string; hotkey: string; run: 'play' | 'fill' | 'top' | Action }[] = [
  { id: 'fill', label: 'Fill bowl +1 (5c)', hotkey: 'f', run: 'fill' },
  { id: 'fill-top', label: 'Fill to top (u)', hotkey: 'u', run: 'top' },
  { id: 'play', label: 'Play ▸', hotkey: 'p', run: 'play' },
  { id: 'pet', label: 'Pet', hotkey: 'e', run: 'pet' },
  { id: 'nap', label: 'Nap/Wake', hotkey: 'n', run: 'nap' },
]

const hourOf = (now: number) => new Date(now).getHours()

type SceneKind = 'raster' | 'image'
const sceneCellsOf = (home: Home, view: View, now: number, flavor: Flavor) => view === 'adopt'
  ? shelterCells(home, now, frame, flavor, cols) : frameCells({ home, now, tick: frame, hour: hourOf(now), flavor, cols, motion,
    camX: camera.x, ...(pairRun ? { partner: { id: pairRun.partnerId, motion: pairRun.partner } } : {}) })
const sceneImageOf = (home: Home, view: View, now: number, flavor: Flavor): RgbaImage => view === 'adopt'
  ? shelterImage(home, now, frame, flavor, cols, PICTURE_SCALE)
  : frameImage({ home, now, tick: frame, hour: hourOf(now), flavor, cols, motion, camX: camera.x, ...(pairRun ? { partner: { id: pairRun.partnerId, motion: pairRun.partner } } : {}) })
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
    const home = await change($, prev => locationKey(prev.weather.location) === key
      ? { ...prev, weather: { ...prev.weather, attemptedAt: now } } : prev)
    if (locationKey(home.weather.location) !== key) return
    let reading: WeatherReading | null = null
    let error: string | null = null
    try {
      reading = parseCurrent(await weatherJson($, forecastUrl(location)), await $.clock.now())
      if (!reading) error = 'Weather data was incomplete or out of date. Retrying in 5 minutes.'
    } catch {
      error = 'Could not reach Open-Meteo. Retrying in 5 minutes.'
    }
    await change($, prev => prev.weather.attemptedAt !== now ? prev
      : { ...prev, weather: acceptWeather(prev.weather, key, reading, error) })
  })()
  weatherJob = { key, task }
  try { await task } finally { if (weatherJob?.task === task) weatherJob = null }
}

const selectWeather = async ($: EngineInterface, location: WeatherLocation) => {
  searchSerial++
  await change($, prev => ({ ...prev, weather: setLocation(prev.weather, location) }))
  await refreshWeather($)
  return { text: `${latest?.weather.location?.label ?? location.label}\n${weatherSummary(latest!.weather, await $.clock.now())}` }
}

const searchWeather = async ($: EngineInterface, query: string): Promise<{ text: string }> => {
  const name = query.trim()
  if (name.length < 2 || name.length > 100) {
    const text = 'Enter a city name (2–100 characters), e.g. /cat weather London, GB.'
    await change($, prev => ({ ...prev, weather: { ...prev.weather, candidates: [], notice: text } }))
    return { text }
  }
  const serial = ++searchSerial
  await change($, prev => ({ ...prev, weather: { ...prev.weather, candidates: [], notice: `Searching for ${name}…` } }))
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
  await change($, prev => ({ ...prev, weather: { ...prev.weather, candidates, notice } }))
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
  await change($, prev => prev)
  const [sub = '', ...rest] = arg.trim().split(/\s+/)
  if (!sub) return { text: `${weatherSummary(latest!.weather, await $.clock.now())}\nSet a city: /cat weather <city> · device: /cat weather system · stop: /cat weather off` }
  if (sub === 'off') {
    searchSerial++
    await change($, prev => ({ ...prev, weather: emptyWeather(prev.weather.units) }))
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
    await change($, prev => ({ ...prev, weather: { ...prev.weather, units } }))
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
  '/cat expedition — Expeditions tab (x)',
  '/cat send <exp> <cat…> [+gear…] — send a party',
  '/cat claim [run] — collect ready rewards',
  '/cat quests — today’s chains in Miles',
  '/cat curio — Pip’s always-open Curio shop',
  '/cat craft <id> — craft using coins and materials',
  '/cat exchange <cat-id> <friend-id> — December gift swap',
  '/cat tea [cat-id] — use one catnip tea',
  '/cat settings — sound, appearance, reactions, weather and arcade display',
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
  '/cat fill [n] — add n portions to the shared bowl (5c each)',
  '/cat world [id] — list worlds with prices, or move to one you own',
  '/cat world buy <id> — buy a world and move the yard there',
  'In the pane: ‹ › tabs · q back · c a s h r b m x g v t visible tab shortcuts · f u fill bowl · e n pet/nap · p arcade · w cat list',
  'On the Cat tab: j and l pan the yard · 0 follows the cat again',
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

// The session's spend in US dollars, or undefined when the host can't say.
const sessionUsd = async ($: EngineInterface) => {
  try {
    const usd = (await $.session.usage()).cost?.usd
    return typeof usd === 'number' && Number.isFinite(usd) ? usd : undefined
  } catch {
    return undefined
  }
}

const userHome = async ($: EngineInterface) => (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))

// /cat export writes a dated backup; /cat import checks one, backs up the current save, then loads it.
const backupCommand = async ($: EngineInterface, sub: 'export' | 'import', arg: string): Promise<{ text: string }> => {
  const dir = backupDir(await userHome($))
  const now = await $.clock.now()
  if (sub === 'export') {
    const home = await change($, prev => prev)
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
  const current = await change($, prev => prev)
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

const applySetting = (key: string, value: unknown) => {
  switch (key) {
    case 'afk-cat.flavor': flavorSetting = String(value); break
    case 'afk-cat.skin': skin = skinLevel(value); break
    case 'afk-cat.sound': isSoundOn = value === true; break
    case 'afk-cat.canvas': canvasMode = value === 'image' || value === 'text' ? value : 'auto'; isImageBlocked = false; break
    case 'afk-cat.reactions': reactionMode = value === 'off' || value === 'quiet' ? value : 'on'; break
  }
}
const setSetting = async ($: EngineInterface, key: string, value: string | boolean) => {
  const result = await $.config.set({ key, value })
  if (result.deny) { $.ui.toast(`Couldn't save setting: ${result.deny}`); return }
  applySetting(key, result.value)
  $.ui.invalidate('ui.render')
}

const readTheme = async ($: EngineInterface) => {
  const row = (await $.config.list()).find(r => r.key === 'theme')
  claudeTheme = typeof row?.value === 'string' ? row.value : 'dark'
}


const emitReaction = async ($: EngineInterface, signals: readonly Signal[], tool = '') => {
  if (!latest || !catsAtHome(latest).length) return
  const now = await $.clock.now(), cat = activeCat(latest)
  motionRng ??= seeded(now)
  if (motionCatId !== cat.id) { motion = startMotion(CLASSIC_X); motionCatId = cat.id }
  const r = pickReaction(cat, signals, tool, now, reactionMemory, motionRng, reactionMode)
  if (!r) return
  reactionMemory = rememberReaction(reactionMemory, cat.id, r.id, now)
  pairRun = null
  motion = forceMove(motion, r.move, motionCtxOf(latest, cols, hourOf(now)), motionRng)
  reactionUntil = frame + motion.left
  await queue(() => change($, (h, t) => track({ ...h, ...(reactionMode === 'on' && r.line ? { log: r.line } : {}), ...(r.effect ? { effect: { kind: r.effect, at: t } } : {}) }, 'react', 1, t)))
  if (reactionMode === 'on' && r.line) $.ui.toast(r.line)
}
const departure = ($: EngineInterface, expId: string, ids: string[], gear: string[]) => {
  const seed = Math.floor(Math.random() * 4294967296)
  return change($, (h, t) => send(h, expId, ids, gear, t, seed))
}

export const register: Register = (on, options) => {
  reactionMode = options.reactions === 'off' || options.reactions === 'quiet' ? options.reactions : 'on'
  pairRun = null; reactionMemory = {}; notifiedRuns.clear()
  flavorSetting = String(options.flavor ?? 'auto')
  isSoundOn = options.sound !== false
  skin = skinLevel(options.skin)
  canvasMode = options.canvas === 'image' || options.canvas === 'text' ? options.canvas : 'auto'
  const flavorAt = (now: number) => resolveFlavor(flavorSetting, claudeTheme, hourOf(now))
  flavorNow = flavorAt

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cat',
      description: 'Open your AFK cats (/cat hide, /cat shelter, /cat adopt [name], /cat switch <name>, /cat rename <name>, /cat weather <city>, /cat export, /cat import <file>, /cat help)',
    })
    await readTheme($)
    paidUsd = await sessionUsd($)
    const saved = (await $.store.get('home')) ?? (await $.store.get('cat'))
    let bonus = 0
    let returns: string[] = []
    const home = await change($, (_, t) => {
      const loaded = resumeExpeditions(migrate(saved, t), t)
      const day = checkIn(think(tick(loaded, t), t, Math.random), t)
      bonus = day.bonus
      returns = readyRuns(day.home, t).filter(r => !day.home.expeditions.inbox.includes(r.id)).map(r => r.exp)
      return finishExpeditions(saved ? welcomeBack(loaded, day.home, t) : day.home, t)
    })
    for (const exp of returns) $.ui.toast(`Expedition ready: ${EXPEDITIONS.find(e => e.id === exp)?.label ?? exp}. Claim in Expeditions.`)
    // Time away and the streak bonus are not this chat's earnings.
    earned.prompt = 0
    earned.chat = 0
    chatMinutes = 0
    owedMinutes = 0
    if (home.effect?.kind === 'welcome') $.ui.toast(home.log)
    if (bonus > 0) $.ui.toast(`Day ${home.streak} streak bonus: +${bonus}c`)
    void refreshWeather($)
    $.clock.every(60_000, () => { void refreshWeather($) })
    $.clock.every(TICK_MS, () => void readTheme($).then(() => {
      let auto = 0
      return change($, (prev, t) => {
        const r = tickTally(prev, t)
        auto = r.deducted
        return think(r.home, t, Math.random, isOnScreen)
      }, () => auto)
    }))
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
      for (const id of notifiedRuns) if (!latest.expeditions.runs.some(r => r.id === id)) notifiedRuns.delete(id)
      const fresh = readyRuns(latest, now).filter(r => !latest!.expeditions.inbox.includes(r.id) && !notifiedRuns.has(r.id))
      if (fresh.length) {
        for (const r of fresh) notifiedRuns.add(r.id)
        void queue(async () => {
          let notices: string[] = []
          await change($, (h, t) => {
            notices = readyRuns(h, t).filter(r => !h.expeditions.inbox.includes(r.id)).map(r => r.exp)
            return finishExpeditions(h, t)
          })
          for (const exp of notices) $.ui.toast(`Expedition ready: ${EXPEDITIONS.find(e => e.id === exp)?.label ?? exp}. Claim in Expeditions.`)
          $.ui.invalidate('ui.render')
        }).finally(() => { for (const r of fresh) notifiedRuns.delete(r.id) })
      }
      // A frame still waiting on its blit holds the next one back, but never past STALL_MS.
      if (paint.isBusy && now - paint.busyAt < STALL_MS) return
      paint.isBusy = true
      paint.busyAt = now
      try {
        frame += 1
        const flavor = flavorAt(now)
        // The active cat roams only while someone can see it.
        if (paint.isMounted) {
          motionRng ??= seeded(now)
          const cat = activeCat(latest), ctx = motionCtxOf(latest, cols, hourOf(now))
          if (motionCatId !== cat.id) { motion = startMotion(CLASSIC_X); motionCatId = cat.id; pairRun = null; intentKey = '' }
          if (pairRun && (pairRun.leadId !== cat.id || isAway(latest, pairRun.partnerId) || isAway(latest, pairRun.leadId))) pairRun = null
          const intent = cat.intent
          const behavior = intent ? BEHAVIORS.find(b => b.id === intent.id) : undefined
          const key = intent ? `${cat.id}:${intent.id}:${intent.at}` : ''
          if (behavior && intent && intentKey !== key) {
            intentKey = key
            if (behavior.partner && intent.with) {
              const yard = latest
              const buddy = yard.cats.find(c => c.id === intent.with && !c.isAsleep && !isAway(yard, c.id))
              const picked = buddy && pickInteraction(latest, cat, buddy, motionRng)
              pairRun = picked && buddy ? startPair(picked, cat.id, buddy.id, motion, ctx, motionRng) : null
            } else {
              pairRun = null
              motion = forceMove(motion, behavior.move, ctx, motionRng, behavior.seconds)
            }
          }
          if (!pairRun && !intent && frame >= reactionUntil && frame % 240 === 0 && !isAway(latest, cat.id)) {
            const buddy = partnerOf(latest, cat.id, motionRng)
            const i = buddy && pickInteraction(latest, cat, buddy, motionRng)
            if (i) pairRun = startPair(i, cat.id, buddy!.id, motion, ctx, motionRng)
          }
          if (pairRun) {
            pairRun = stepPair(pairRun, ctx); motion = pairRun.lead
            if (pairRun.left <= 0) {
              const run = pairRun, i = INTERACTIONS.find(i => i.id === run.id)!
              pairRun = null; motion = { ...motion, left: 0 }
              void queue(() => change($, (h, t) => {
                if (isAway(h, run.leadId) || isAway(h, run.partnerId)) return h
                const key = bondKey(run.leadId, run.partnerId), before = h.bonds[key]?.points ?? 0
                let bondedHome = addBond(h, run.leadId, run.partnerId, i.bond, t)
                if (h.cats.some(c => [run.leadId, run.partnerId].includes(c.id) && skillTotals(c).harmony > 0)) bondedHome = { ...bondedHome, cats: bondedHome.cats.map(c => [run.leadId, run.partnerId].includes(c.id) ? { ...c, joy: Math.min(100, c.joy + 5) } : c) }
                const gained = (bondedHome.bonds[key]?.points ?? 0) - before
                return track({ ...bondedHome, log: i.line }, 'bond', gained, t)
              }))
            }
          } else if (!isAway(latest, cat.id)) motion = stepMotion(motion, ctx, motionRng)
          camera = followCam(camera, Math.round(motion.x / DESIGN), 14, yardCols(latest, cols), cols, frame)
        }
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
        const run = { cat: activeCat(latest), flavor, tick: frame, x: runX, cols: band.cols, isSprint, isAway: !catsAtHome(latest).length }
        if ((await $.ui.blit({ requestId: band.id, key: RUNNER, cells: runFrame(run) })).deny) band.mode = 'off'
      } finally {
        paint.isBusy = false
      }
    })
    return next(e)
  })


  on('ui.message', { element: 'expedition-keys' }, async ($, e) => {
    if (!latest || (await read($, routeRef))?.view !== 'expedition') return {}
    const key = (e.data as { key?: string } | null)?.key, here = catsAtHome(latest)
    if (key === 'left' || key === 'right') {
      partyCursor = (partyCursor + (key === 'left' ? -1 : 1) + here.length) % Math.max(1, here.length)
      partySelection = here[partyCursor] ? [here[partyCursor]!.id] : []
      $.ui.invalidate('ui.render')
    } else if (key === 'return' && here.length) {
      const selected = partySelection.filter(id => here.some(c => c.id === id))
      const ids = selected.length ? selected : here.slice(0, 1).map(c => c.id)
      await departure($, EXPEDITIONS[expeditionChoice % EXPEDITIONS.length]!.id, ids, gearSelection.filter(id => (latest!.gear[id] ?? 0) > 0))
    }
    return {}
  })

  on('command.run', { command: 'cat' }, async ($, e) => {
    const [sub = '', ...rest] = wordsOf(e.args)
    const arg = rest.join(' ')

    if (['expedition', 'quests', 'curio', 'settings'].includes(sub)) {
      await routeTo($, sub === 'expedition' ? 'expedition' : sub === 'quests' ? 'miles' : sub === 'settings' ? 'settings' : 'home')
      await change($, h => h)
      await $.ui.open({ id: PANE, title: 'AFK Cat' })
      return { text: sub === 'curio' ? 'Pip’s Curio shop is always open.' : `Opened ${sub}.` }
    }
    if (sub === 'send') {
      const id = rest[0] ?? '', names = rest.slice(1).filter(s => !s.startsWith('+'))
      const gear = rest.slice(1).filter(s => s.startsWith('+')).map(s => s.slice(1))
      await change($, h => h)
      const ids = names.map(n => catRef(latest!, n))
      return { text: (await departure($, id, ids, gear)).log }
    }
    if (sub === 'claim') return { text: (await change($, (h, t) => arg ? claim(h, arg, t) : readyRuns(h, t).reduce((next, r) => claim(next, r.id, t), h))).log }
    if (sub === 'craft') return { text: (await change($, (h, t) => craft(h, arg, t))).log }
    if (sub === 'tea') return { text: (await change($, h => drinkTea(h, arg || activeCat(h).id))).log }
    if (sub === 'exchange') return { text: (await change($, (h, t) => exchange(h, catRef(h, rest[0] ?? activeCat(h).id), catRef(h, rest[1] ?? ''), t, Math.random))).log }
    if (sub === 'hide' || sub === 'close') {
      await $.ui.close({ id: PANE })
      return { text: 'The cats will keep earning while the pane is closed. /cat brings it back.' }
    }
    if (sub === 'export' || sub === 'import') return backupCommand($, sub, arg)
    if (sub === 'theme') return themeCommand($, arg)
    if (sub === 'fill') {
      const n = arg ? Number(arg) : 1
      if (!Number.isInteger(n) || n < 1) return { text: 'Usage: /cat fill [portions]' }
      return { text: (await change($, (h, t) => fillBowl(h, n, t))).log }
    }
    if (sub === 'world') {
      if (rest[0] === 'buy') return { text: (await change($, (p, t) => buyWorld(p, rest.slice(1).join(' ').trim().toLowerCase(), t))).log }
      if (!arg) {
        const home = await change($, h => h)
        const lines = WORLDS.map(w => `${w.id} (${w.label}) ${isWorldOwned(home, w.id) ? 'owned' : costText(w.cost ?? {})}`)
        return { text: `Worlds: ${lines.join(', ')}. /cat world <id> · /cat world buy <id>.` }
      }
      return { text: (await change($, prev => setWorld(prev, arg.trim().toLowerCase()))).log }
    }
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
    if (sub === 'rename' && arg) home = await change($, prev => rename(prev, arg))
    else if (sub === 'adopt') {
      await routeTo($, 'adopt')
      home = await change($, (prev, t) => adopt(prev, t, Math.random, arg || undefined))
    }
    else if (sub === 'switch') home = await change($, prev => (arg ? switchTo(prev, arg) : nextCat(prev)))
    else if (sub === 'reset') home = await change($, (_, t) => newHome(t))
    else home = await change($, prev => prev)
    await $.ui.open({ id: PANE, title: 'AFK Cat' })
    if (sub === 'switch') return { text: `${home.log} Cats: ${home.cats.map(c => c.name).join(', ')}.` }
    return { text: 'Your cats are in the pane.' }
  })

  on('config.set', async ($, e, next) => {
    const result = await next(e)
    if (result.deny) return result
    if (e.key === 'theme') await readTheme($)
    else if (e.key.startsWith('afk-cat.')) applySetting(e.key, result.value)
    $.ui.invalidate('ui.render')
    return result
  })
  on('tool.call', async ($, e, next) => {
    sprintUntil = frame + 16
    const command = e.tool === 'Bash' && 'command' in e ? String(e.command ?? '') : ''
    // Cosmetic timers and reactions must never change the real tool's result.
    let cancel = () => {}
    try {
      const timer = $.clock.after(20000, () => { void emitReaction($, ['tool.long'], e.tool).catch(() => undefined) })
      cancel = () => timer.cancel()
    } catch {}
    try {
      const ran = await next(e)
      void queue(() => change($, (h, t) => track(reward(h, rollToolPay(h, Math.random) * rampOf(chatMinutes)), 'tools', 1, t)))
      await emitReaction($, signalsOf({ tool: e.tool, command, isError: ran.isError === true || !!ran.deny, ms: 0 }), e.tool).catch(() => undefined)
      return ran
    } catch (error) {
      await emitReaction($, ['tool.error'], e.tool).catch(() => undefined)
      throw error
    } finally { try { cancel() } catch {} }
  })

  on('turn.start', async ($, e, next) => {
    earned.prompt = 0
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await emitReaction($, [turnSignal(e.reason)]).catch(() => undefined)
    await queue(async () => {
      const usd = await sessionUsd($)
      const spent = usd === undefined || paidUsd === undefined ? 0 : usd - paidUsd
      const minutes = activeMinutes(e.durationMs)
      const owed = owedMinutes
      const ramp = rampOf(chatMinutes)
      // Payout state advances only once the reward lands; a failed write leaves it for the next reply.
      let isApplied = false
      const settled = () => {
        isApplied = true
        paidUsd = usd ?? paidUsd
        chatMinutes += minutes + owed
        owedMinutes -= owed
      }
      try {
        await change($, (prev, t) => {
          const pay = (activePay(prev, e.durationMs) + coinRate(prev) * owed + spendPay(prev, spent)) * ramp
          const paid = { ...reward(prev, pay, 2, t), effect: { kind: 'coins' as const, at: t } }
          return track(pay > 0 ? { ...paid, log: `Claude worked ${Math.round(minutes + owed)}m: +${fmtCoins(pay)}` } : paid, 'turns', 1, t)
        }, undefined, settled)
      } catch {
        // A reward that landed is kept by the next save, so only an unapplied one is owed.
        if (!isApplied) owedMinutes += minutes
        return
      }
      $.ui.toast(`💰 +${fmtCoins(earned.prompt)} this prompt · +${fmtCoins(earned.chat)} this chat · ×${ramp.toFixed(1)} session`)
    })
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
    const sceneAlt = view !== 'adopt' ? catsAtHome(home).length ? `${cat.name} (${mood}) in the yard` : 'All cats are away on expeditions'
      : reveal ? `${reveal.name} at the adoption shelter` : 'A mystery parcel at the adoption shelter'
    const scene = sceneImage && 'Image' in ui
      ? <ui.Image key={SCENE} columns={cols} rows={ROWS} source={sceneImage} alt={sceneAlt} />
      : 'Raster' in ui ? <ui.Raster key={SCENE} columns={cols} rows={ROWS} cells={sceneCells} />
      : view === 'adopt' && !reveal ? <Text color={tone.accent}>{'   /─────\\\n   │  ?  │\n   └─────┘'}</Text>
        : <Box flexDirection="column">{view !== 'adopt' && !catsAtHome(home).length ? <Text>🐾 All cats are away on expeditions</Text> : catArt(mood, home.frame, formOf(cat)).map(line => <Text>{line}</Text>)}</Box>

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
              await change($, prev => switchTo(prev, reveal.id))
              await routeTo($, 'cat')
            }} />
            {room > 0 && home.coins >= price && <Button key="shelter-again" plain label={` Pull again · ${fmtCoins(price)}`}
              onPress={() => change($, (prev, t) => adopt(prev, t, Math.random))} />}
          </Box>
        </Box>}
        <Button key="adopt" plain label={room <= 0 ? 'House full · expand in Home'
          : home.coins < price ? `Need ${fmtCoins(price)} to roll & adopt` : `Roll & adopt · ${fmtCoins(price)}`}
          onPress={() => change($, (prev, t) => adopt(prev, t, Math.random))} />
        {room <= 0 && <Button key="shelter-expand" plain label="Go to Home" onPress={() => routeTo($, 'home')} />}
        <Text color={tone.muted}>One cat per pull. The fee is charged only when adoption succeeds. No cats are replaced.</Text>
        {home.shinyCharm && <Text color={tone.accent}>Shiny charm ready · your next shelter cat will sparkle.</Text>}
        <Text bold color={tone.title}>Rarity odds</Text>
        {Object.entries(RARITIES).map(([key, r]) => <Text key={`odds-${key}`} color={css(flavor[r.color])}>
          {r.label} {r.odds}% · {availableBreeds(now).filter(b => b.rarity === key).map(b => b.label).join(', ')}
        </Text>)}
        <Text color={tone.muted}>Ghost: available in October. Cats you adopt stay year-round.</Text>
        <Text color={tone.muted}>Coats within each tier have equal odds. Markings and silhouettes vary independently. Shiny: 1/64, in any tier.</Text>
        <Text color={tone.muted}>Rarity is cosmetic. Personality keeps its usual bonuses.</Text>
        {home.visitors.length > 0 && <Text bold color={tone.title}>Yard visitors · free adoption</Text>}
        {home.visitors.map(v => <Box key={`shelter-${v.id}`} flexDirection="column">
          <Text color={css(flavor[RARITIES[rarityOf(v.genes)].color])}>{rarityBadge(v.genes)} · {v.name}</Text>
          <Text color={tone.muted}>{describeGenes(v.genes)}</Text>
          <Button key={`shelter-adopt-${v.id}`} plain label={`Welcome ${v.name}`} onPress={() => change($, (prev, t) => adoptVisitor(prev, v.id, t))} />
        </Box>)}
        <Text italic color={tone.log}>{home.log}</Text>
      </Box>
    }

    if (view === 'settings') {
      const rows = (await $.config.list()).filter(r => r.key.startsWith('afk-cat.'))
      return <Box flexDirection="column">
        {tabs}
        <Text bold color={tone.title}>Cat settings</Text>
        <Text color={tone.muted}>Changes save immediately. Sound controls the cat's chiptune effects.</Text>
        {rows.map(row => <Box key={`setting-${row.key}`} flexDirection="column">
          <Text bold color={tone.accent}>{row.label} · {typeof row.value === 'boolean' ? row.value ? 'on' : 'off' : String(row.value)}{row.isLocked ? ' · locked' : ''}</Text>
          {row.description && <Text color={tone.muted}>{row.description}</Text>}
          {row.isLocked ? <Text dimColor>Managed by your host settings.</Text> : row.kind === 'boolean'
            ? <Button key={`setting-${row.key}-toggle`} plain label={row.value ? 'Turn off' : 'Turn on'} onPress={() => setSetting($, row.key, !row.value)} />
            : (row.options ?? SETTING_CHOICES[row.key] ?? []).map(value => <Button key={`setting-${row.key}-${value}`} plain
              label={`${row.value === value ? '●' : '○'} ${value}`} onPress={() => setSetting($, row.key, value)} />)}
        </Box>)}
        {!rows.length && <Text color={tone.muted}>Plugin settings are available in the host's /config menu.</Text>}
        <Button key="settings-sound-preview" plain label={isSoundOn ? 'Preview level-up sound' : 'Sound preview muted'}
          onPress={async () => { if (isSoundOn) { try { await playClip($, 'levelup') } catch { $.ui.toast('Sound playback is unavailable on this host.') } } }} />
        <Text bold color={tone.title}>Claude Code theme · {claudeTheme}</Text>
        {FLAVOR_NAMES.map(name => <Button key={`settings-theme-${name}`} plain label={name}
          onPress={async () => { const result = await themeCommand($, name); $.ui.toast(result.text) }} />)}
        <Text bold color={tone.title}>Yard world · {home.world.id}</Text>
        {WORLDS.map(world => {
          if (isWorldOwned(home, world.id)) return <Button key={`settings-world-${world.id}`} plain label={`${home.world.id === world.id ? '●' : '○'} ${world.label}`}
            onPress={() => change($, h => setWorld(h, world.id))} />
          const check = canBuyWorld(home, world.id)
          const label = check.ok ? `Buy ${world.label} — ${costText(world.cost ?? {})}` : `${world.label} — ${check.reason}`
          return <Button key={`settings-world-${world.id}`} plain label={label} onPress={() => change($, (h, t) => buyWorld(h, world.id, t))} />
        })}
        <Text bold color={tone.title}>Weather · {weatherSummary(home.weather, now)}</Text>
        <Button key="settings-weather" plain label="Choose weather location" onPress={() => routeTo($, 'weather')} />
        <Button key="settings-weather-units" plain label={home.weather.units === 'c' ? 'Use °F' : 'Use °C'}
          onPress={() => change($, h => ({ ...h, weather: { ...h.weather, units: h.weather.units === 'c' ? 'f' : 'c' } }))} />
        <Button key="settings-weather-off" plain label="Turn live weather off" onPress={async () => { await weatherCommand($, 'off') }} />
        <Text bold color={tone.title}>Arcade display</Text>
        {(['glow', 'crt'] as const).map(key => <Button key={`settings-${key}`} plain label={`${key === 'crt' ? 'CRT' : 'Glow'}: ${home.prefs[key] ? 'on' : 'off'}`}
          onPress={() => change($, h => ({ ...h, prefs: { ...h.prefs, [key]: !h.prefs[key] } }))} />)}
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
        {'Input' in ui ? <ui.Input key="weather-city" label="Search city" placeholder="e.g. Paris, FR" submitLabel="search"
          onSubmit={async value => { await searchWeather($, value) }} />
          : <Text>Search a city: /cat weather {'<city>'}, e.g. Paris, FR</Text>}
        {home.weather.notice && <Text color={tone.muted}>{home.weather.notice}</Text>}
        {home.weather.candidates.map((location, i) => <Button key={`weather-city-${i + 1}`} plain
          label={`${i + 1}. ${location.label}`} onPress={async () => { await selectWeather($, location) }} />)}
        <Button key="weather-system" plain label="Use device location…" onPress={async () => {
          const result = await openWeatherLocation($)
          await change($, prev => ({ ...prev, weather: { ...prev.weather, notice: result.text } }))
        }} />
        <Text color={tone.muted}>Opens your browser for location permission. The rounded location is saved with your cats and sent to Open-Meteo.</Text>
        <Box>
          <Button key="weather-refresh" label="Refresh" onPress={() => refreshWeather($, true)} />
          <Button key="weather-units" label={home.weather.units === 'c' ? 'Use °F' : 'Use °C'}
            onPress={() => change($, prev => ({ ...prev, weather: { ...prev.weather, units: prev.weather.units === 'c' ? 'f' : 'c' } }))} />
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
        await change($, (prev, t) => startGame(prev, id, t))
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
              if (!(await openArcade($, true))) await change($, prev => ({ ...prev, log: 'The arcade needs Node.js on your PATH.' }))
            }} />
          {url ? <Text color={tone.muted}>{'   '}<ui.Link href={url}>{`localhost:${arcade.port}`}</ui.Link> · stays up while Claude Code runs</Text> : null}
          {open && (
            <Box flexDirection="column">
              <Text color={tone.ok}>▶ {cat.name} is playing {gameOf(open.game)?.name} in the browser.</Text>
              <Button key="arcade-quit" plain label="   Quit the round" onPress={() => change($, prev => quitGame(prev))} />
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
            onPress={() => change($, (prev, t) => act(prev, 'play', t))} />
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
                <Button key={`donate-${id}`} plain label="Donate" onPress={() => change($, (prev, t) => donateCritter(prev, id, t))} />
              )}
              <Button key={`sell-${id}`} plain label={` Sell ${critter(id)?.value}c`} onPress={() => change($, prev => sell(prev, id))} />
            </Box>
          ))}
          <Text bold color={tone.accent}>Cat book</Text>
          <Text>Coats {home.book.coats.length}/{COATS.length}: {COATS.map(c => `${home.book.coats.includes(c) ? c : '???'}${breedOf(c).available ? ' (October)' : ''}`).join(' · ')}</Text>
          <Text>Forms {home.book.forms.length}/4: {FORMS.map(f => (home.book.forms.includes(f) ? f : '???')).join(' · ')}</Text>
          <Text>Shinies: {home.book.shinies.join(', ') || 'none yet'} · strays met: {home.book.visitors.length}</Text>
          <Text>Photos: {home.book.photos.map(n => `📷 ${n}`).join('  ') || 'none yet (reach Best friend)'}</Text>
          <Text italic color={tone.log}>{home.log}</Text>
        </Box>
      )
    }


    if (view === 'expedition') {
      const catById = new Map(home.cats.map(c => [c.id, c]))
      const here = catsAtHome(home), selection = partySelection.filter(id => here.some(c => c.id === id))
      const ids = selection.length ? selection : here.slice(0, 1).map(c => c.id)
      const selected = EXPEDITIONS[expeditionChoice % EXPEDITIONS.length]!
      const gear = gearSelection.filter(id => (home.gear[id] ?? 0) > 0)
      const cycleParty = (step: number) => { partyCursor = (partyCursor + step + here.length) % Math.max(1, here.length); partySelection = here[partyCursor] ? [here[partyCursor]!.id] : []; $.ui.invalidate('ui.render') }
      return <Box flexDirection="column">
        {tabs}{scene}
        <Text bold color={tone.title}>Expeditions · {home.expeditions.runs.length}/{slotsOf(home)} slots used</Text>
        {home.expeditions.runs.map(r => {
          const ready = r.endsAt <= now, minutes = Math.max(0, Math.ceil((r.endsAt - now) / 60000))
          return <Box flexDirection="column">
            <Text>{EXPEDITIONS.find(e => e.id === r.exp)?.label ?? r.exp} · {r.cats.map(id => catById.get(id)?.name ?? id).join(', ')} · {bar(100 * Math.min(1, (now - r.startAt) / (r.endsAt - r.startAt)), 10)} · {ready ? 'Ready to claim' : `${minutes}m left`}</Text>
            {ready && <Button key={`claim-${r.id}`} plain label="Claim rewards" onPress={() => change($, (h, t) => claim(h, r.id, t))} />}
            {r.cats.some(id => { const cat = catById.get(id); return cat && skillTotals(cat).oracle > 0 }) && <Text>Oracle: {lootOf(r).coins}c · {Object.entries(lootOf(r).materials).map(([id, n]) => `${n} ${id}`).join(', ')}</Text>}
          </Box>
        })}
        {'Client' in ui && <ui.Client key="expedition-keys" module="./ui/expedition-keys.tsx" props={{ names: ids.map(id => catById.get(id)?.name ?? id), trail: selected.label }} height={2} />}
        <Text bold>Party · click the keyboard row for ← → and Enter; choose more below</Text>
        <Box><Button key="party-prev" plain label="←" onPress={() => cycleParty(-1)} /><Button key="party-next" plain label="→" onPress={() => cycleParty(1)} /></Box>
        {here.map(c => <Button key={`party-${c.id}`} plain label={`${ids.includes(c.id) ? '✓' : '·'} ${c.name} · L${c.level} · energy ${Math.floor(c.energy)}`} onPress={() => { partySelection = ids.includes(c.id) ? ids.filter(id => id !== c.id) : [...ids, c.id]; $.ui.invalidate('ui.render') }} />)}
        <Text>Gear · one of each per party, consumed when sent</Text>
        {SHOP.filter(i => i.kind === 'gear' && (home.gear[i.id] ?? 0) > 0).map(i => <Button key={`gear-${i.id}`} plain label={`${gear.includes(i.id) ? '✓' : '·'} ${i.name} (${home.gear[i.id]}) · ${i.text}`} onPress={() => { gearSelection = gear.includes(i.id) ? gear.filter(id => id !== i.id) : [...gear, i.id]; $.ui.invalidate('ui.render') }} />)}
        <Text bold>Trails</Text>
        {EXPEDITIONS.map((e, i) => {
          const check = canSend(home, e.id, ids, now)
          return <Box flexDirection="column">
            <Button key={`expedition-${e.id}`} plain label={`${selected.id === e.id ? '▸' : '·'} ${e.label} · ${e.minutes}m · ${e.cost.coins}c + ${e.cost.energy} energy/cat · L${e.minLevel} · party ${e.party.join('–')}`} onPress={() => { expeditionChoice = i; $.ui.invalidate('ui.render') }} />
            <Text color={check.ok ? tone.muted : tone.warn}>{check.ok ? e.blurb : check.reason} · Finds: {Object.keys(e.loot.materials).join(', ')} · {e.loot.rolls.join('–')} rolls/cat · {e.loot.coins.join('–')} × coin rate · critters{e.loot.rare ? ` · rare ${e.loot.rare.item}` : ''}</Text>
          </Box>
        })}
        <Button key="expedition-send" plain hotkey="d" label={`Send to ${selected.label}`} onPress={() => departure($, selected.id, ids, gear)} />
        <Text italic color={tone.log}>{home.log}</Text>
      </Box>
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
          <Text bold color={tone.accent}>Quest chains · two a day</Text>
          {questsFor(now).map(q => {
            const state = questState(home, now), p = state.progress[q.id] ?? { step: 0, count: 0 }, step = q.steps[p.step]
            return <Box flexDirection="column">
              <Text>{q.label} · {state.claimed.includes(q.id) ? 'claimed ✓' : step ? `${step.text} (${p.count}/${step.goal}) · step ${p.step + 1}/${q.steps.length}` : 'Ready to claim!'}</Text>
              {!step && !state.claimed.includes(q.id) && <Button key={`quest-${q.id}`} plain label={`Claim ${q.label}`} onPress={() => change($, (h, t) => claimQuest(h, q.id, t))} />}
            </Box>
          })}
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
              onPress={() => change($, prev => buyWithMiles(prev, item.id))} />
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
            const nextLevel = toNextLevel(c.friendship)
            const points = c.daily.day === day ? c.daily.points : 0
            const gifted = c.daily.day === day && c.daily.gifted
            const level = friendLevel(c.friendship)
            return (
              <Box flexDirection="column">
                <Button key={`friend-${c.id}`} plain label={`${c.id === cat.id ? '▸' : ' '} ${c.name} · ${levelName(c.friendship)} (${level}/${LEVELS.length})`}
                  onPress={() => change($, prev => switchTo(prev, c.id))} />
                <Text color={tone.accent}>
                  {'   '}{nextLevel ? `${bar(((c.friendship - (LEVELS[level - 1]?.at ?? 0)) / (nextLevel.at - (LEVELS[level - 1]?.at ?? 0))) * 100, 10)} ${nextLevel.need} to go` : '★ best friends'}
                  {' · '}today {points}/{DAILY_CAP}{gifted ? ' · gifted ✓' : ''}
                </Text>
                <Text color={tone.muted}>
                  {'   '}{level >= NICKNAME_LEVEL ? '✓' : '·'} nickname  {level >= CATCHPHRASE_LEVEL ? '✓' : '·'} catchphrase  {level >= PHOTO_LEVEL ? '✓ photo' : '· photo'}
                </Text>
              </Box>
            )
          })}
          <Text bold color={tone.accent}>Bonds</Text>
          {Object.entries(home.bonds).map(([key, b]) => <Text>{key.split('|').map(id => home.cats.find(c => c.id === id)?.name ?? id).join(' + ')} · {levelName(b.points)} · {b.points} points · today {b.day === day ? b.today : 0}/10</Text>)}
          {activeEvents(now).some(e => e.kind === 'exchange') && <Box flexDirection="column">
            <Text bold>December gift exchange</Text>
            {[...catsAtHome(home).filter(c => c.id !== cat.id), ...home.visitors].map(c => <Button key={`exchange-${c.id}`} plain label={`Exchange with ${c.name}`} onPress={() => change($, (h, t) => exchange(h, activeCat(h).id, c.id, t, Math.random))} />)}
          </Box>}
          <Text bold color={tone.accent}>Give {cat.name} a gift (once a day; favorites count more)</Text>
          <Box flexDirection="column">
            {GIFTS.map(g => (
              <Button key={`gift-${g.id}`} plain label={`${g.name} · ${g.price}c`}
                onPress={() => change($, (prev, t) => giveGift(prev, g.id, t))} />
            ))}
          </Box>
          <Text italic color={tone.log}>{home.log}</Text>
        </Box>
      )
    }

    if (view === 'home') {
      const tier = tierOf(home)
      const nextTier = tierAt(home.tier + 1)
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
                <Button key="pay" plain label="Pay 100c" onPress={() => change($, prev => payLoan(prev, 100))} />
              </Box>
            : <Button key="loan" plain label={`Ask Tom Mew to build a ${nextTier.name} · ${fmtCoins(nextTier.loan)} loan · ${nextTier.maxCats} cats`}
                onPress={() => change($, prev => takeLoan(prev))} />}
          <Text bold color={tone.accent}>Yard — strays drawn by your decor (pull {baitOf(home).total})</Text>
          {home.visitors.length === 0 && <Text color={tone.muted}>No strays right now. They come and go while you work.</Text>}
          {home.visitors.map(v => (
            <Box>
              <Text>{v.name} — {describeGenes(v.genes)} · leaves in {Math.max(0, Math.ceil((v.leavesAt - now) / 3_600_000))}h · gift {v.gift}c </Text>
              <Button key={`adopt-${v.id}`} plain label={`Adopt ${v.name}`} onPress={() => change($, (prev, t) => adoptVisitor(prev, v.id, t))} />
            </Box>
          ))}
          <Text bold color={tone.accent}>Placed</Text>
          <Text color={tone.muted}>{tier.slots.map(slot => `${slot}: ${furniture(home.decor[slot])?.name ?? '—'}`).join(' · ')}</Text>
          {spare.map(id => (
            <Button key={`place-${id}`} plain label={`Place ${furniture(id)?.name} (${furniture(id)?.slot})`}
              onPress={() => change($, prev => place(prev, id))} />
          ))}
          <Text bold color={tone.accent}>
            Nyan's shop · {isOpen ? `open until ${SHOP_CLOSE}:00 · new stock daily` : `closed · opens at ${SHOP_OPEN}:00`}
          </Text>
          {stock.map(item => (
            <Button key={`buy-${item.id}`} plain
              label={`${home.owned.includes(item.id) ? '✓' : ' '} ${item.name} · ${item.price}c · ${item.slot} · ${item.perk}`}
              onPress={() => change($, (prev, t) => buyItem(prev, item.id, t, hourOf(t)))} />
          ))}
          <Text bold color={tone.accent}>Pip’s Curio shop · always open</Text>
          <Text>Materials: {Object.entries(home.materials).map(([id, n]) => `${id} ${n}`).join(' · ') || 'send a party to Garden Patrol'}</Text>
          {SHOP.filter(i => i.shop === 'curio').map(i => {
            const check = canCraft(home, i.id)
            return <Button key={`craft-${i.id}`} plain label={`${i.name} · ${costText(i.cost)} · ${i.text}${check.ok ? '' : ` · ${check.reason}`}`} onPress={() => change($, (h, t) => craft(h, i.id, t))} />
          })}
          {(home.gear['catnip-tea'] ?? 0) > 0 && <Button key="drink-tea" plain label={`Drink catnip tea (${home.gear['catnip-tea']})`} onPress={() => change($, h => drinkTea(h, activeCat(h).id))} />}
          <Text bold color={tone.accent}>Catnip market · it's {seasonOf(new Date(now).getMonth() + 1)}</Text>
          {(() => {
            const market = marketNow(now, hour, isOpen)
            const held = home.catnip.week === weekOf(now) ? home.catnip.qty : 0
            const holding = held > 0 ? ` · you hold ${held} (paid ${home.catnip.paid}c each, spoils after Saturday)` : ''
            if (market.kind === 'buy') {
              return (
                <Box>
                  <Text>Daisy Meow sells catnip at {market.price}c a bundle{holding} </Text>
                  <Button key="catnip-10" plain label="Buy 10" onPress={() => change($, (prev, t) => buyCatnip(prev, 10, t, hourOf(t), isShopOpen(hourOf(t))))} />
                  <Button key="catnip-50" plain label=" Buy 50" onPress={() => change($, (prev, t) => buyCatnip(prev, 50, t, hourOf(t), isShopOpen(hourOf(t))))} />
                </Box>
              )
            }
            if (market.kind === 'sell') {
              return (
                <Box>
                  <Text>Nyan buys catnip for {market.price}c right now{holding} </Text>
                  {held > 0 && <Button key="catnip-sell" plain label="Sell all" onPress={() => change($, (prev, t) => sellCatnip(prev, t, hourOf(t), isShopOpen(hourOf(t))))} />}
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
                    onPress={() => change($, prev => learnSkill(prev, sk.id))} />
                )
              })}
            </Box>
          ))}
          <Text italic color={tone.log}>{home.log}</Text>
          <Button key="respec" plain label={`Reset skills · ${respecPrice(cat)}c`}
            onPress={() => change($, (prev, t) => respec(prev, t))} />
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
              await change($, prev => switchTo(prev, c.id))
              await update($, catListRef, () => false)
            }} />
        ))}
        {isCatListOpen && home.cats.length < maxCats(home) && (
          <Text color={tone.muted}>{'   '}+ room for {maxCats(home) - home.cats.length} more · visit the Adopt tab</Text>
        )}
        {stat('Hunger', cat.hunger)}
        {stat('Joy', cat.joy)}
        {stat('Energy', cat.energy)}
        <Text color={tone.accent}>Bowl {'▮'.repeat(Math.max(0, Math.min(BOWL_CAP, home.bowl.food)))}{'▯'.repeat(BOWL_CAP - Math.max(0, Math.min(BOWL_CAP, home.bowl.food)))} {home.bowl.food}/{BOWL_CAP}</Text>
        <Text color={tone.accent}>
          XP {bar((cat.xp / xpToNext(cat.level)) * 100, 10)} {cat.xp}/{xpToNext(cat.level)}
        </Text>
        <Text color={tone.coin}>
          Coins {fmtCoins(home.coins)} (+{idleRate(home).toFixed(1)}/min idle · ×{rampOf(chatMinutes).toFixed(1)} session · +{toolPay(home).toFixed(1)}/tool, {TOOL_CHANCE * 100}% of calls)
          {freePoints(cat) > 0 ? ` · ${freePoints(cat)} skill point${freePoints(cat) > 1 ? 's' : ''} to spend (s)` : ''}
        </Text>
        <Text italic color={tone.log}>{home.log}</Text>
        {yardCols(home, cols) > cols && (
          <Box>
            <Button key="pan-left" plain hotkey="j" label="◂ yard (j)"
              onPress={() => { camera = panCam(camera, -1, yardCols(home, cols), cols, frame) }} />
            <Button key="pan-follow" plain hotkey="0" label={`follow ${cat.name} (0)`}
              onPress={() => { camera = { ...camera, manualUntil: 0 } }} />
            <Button key="pan-right" plain hotkey="l" label="yard ▸ (l)"
              onPress={() => { camera = panCam(camera, 1, yardCols(home, cols), cols, frame) }} />
          </Box>
        )}
        <Box>
          {ACTIONS.map(a => (
            <Button key={a.id} label={a.label} hotkey={a.hotkey}
              onPress={async () => {
                const run = a.run
                if (run === 'play') { await routeTo($, 'arcade'); await openArcade($); return }
                if (run === 'fill') return change($, (prev, t) => fillBowl(prev, 1, t))
                if (run === 'top') return change($, (prev, t) => fillBowl(prev, BOWL_CAP, t))
                if (run === 'pet' || run === 'nap') return change($, (prev, t) => act(prev, run, t))
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
      const run = { cat: activeCat(latest), flavor: flavorAt(now), tick: frame, x: runX, cols: width, isSprint: frame < sprintUntil, isAway: !catsAtHome(latest).length }
      return <ui.Raster key={RUNNER} columns={width} rows={RUN_ROWS} cells={runFrame(run)} />
    }
    band.mode = 'text'
    return <ui.Text color={uiTokens(flavorAt(now)).accent}>{latest && !catsAtHome(latest).length ? '🐾  🐾  🐾 away on a trip' : walkFrame(frame, e.props.bodyColumns)}</ui.Text>
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
