import { read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Home, View } from '../types'
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
import type { Coat } from '../types'
import { LOAN_SHARE, SHOP_CLOSE, SHOP_OPEN, TIERS, baitOf, dailyStock, furniture, isShopOpen, maxCats, payLoan, place,
  takeLoan, tierOf } from './home'
import { ROWS, frameCells, sceneCols } from './scene'
import { CLIP_FOR, clipAsset, powershellArgv } from './sfx'
import type { Clip } from './sfx'
import { BRANCHES, FORM_LEVEL, SKILLS, branchPoints, canLearn, formOf, freePoints, rankOf, respecPrice } from './skills'
import type { Branch } from './skills'
import { catHint, doneWord, hintTail, pawPrefix, skinLevel, spinnerWord, walkFrame } from './skin'
import { FLAVORS, FLAVOR_NAMES, resolveFlavor, themeOptionFor, uiTokens } from './theme'
import type { Flavor } from './theme'
import type { SkinLevel } from './skin'

const PANE = 'afk-cat'
const SCENE = 'scene'
const SERVER = 'server/arcade.mjs'
const SERVER_START_MS = 10_000
const TICK_MS = 10_000
const FRAME_MS = 125
const homeRef = { plugin: 'afk-cat', key: 'home' } as const
const viewRef = { plugin: 'afk-cat', key: 'view' } as const
const catListRef = { plugin: 'afk-cat', key: 'isCatListOpen' } as const
const TABS: { view: View; label: string; hotkey: string }[] = [
  { view: 'cat', label: 'Cat', hotkey: 'c' },
  { view: 'skills', label: 'Skills', hotkey: 's' },
  { view: 'home', label: 'Home', hotkey: 'h' },
  { view: 'friends', label: 'Friends', hotkey: 'r' },
  { view: 'book', label: 'Book', hotkey: 'b' },
  { view: 'miles', label: 'Miles', hotkey: 'm' },
  { view: 'arcade', label: 'Arcade', hotkey: 'g' },
]
const COATS: Coat[] = ['ginger', 'tabby', 'grey', 'black', 'white', 'cream', 'calico', 'tuxedo', 'siamese']
const FORMS = ['ninja', 'royal', 'cloud', 'chonk']

// Latest home and scene width for the animation loop, which repaints without a render pass.
let latest: Home | null = null
let cols = 34
let frame = 0
// Claude Code's own theme row, read for the `auto` flavor.
let claudeTheme = 'dark'
let isSoundOn = true
let skin: SkinLevel = 'full'
// True while the walking band is on screen; the frame loop repaints it only then.
let isBandShown = false
let flavorNow: (now: number) => Flavor = () => FLAVORS.mocha
// The browser arcade's server: started on first use, killed with the module; the token guards it.
const arcade = { port: 0, token: newToken(Math.random), starting: null as Promise<number> | null, pushed: '', isOpened: false }

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
  $.ui.status(`🐱 ${cat.name} Lv${cat.level} ${moodOf(cat)} · ${Math.floor(home.coins)}c`)
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
    return msg.kind === 'quit' ? quitGame(h) : finishGame(h, msg.game, msg.score, msg.ms, t)
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

const HELP = [
  '/cat (or /cat show) — open the pane',
  '/cat hide — close the pane (the cats keep earning)',
  '/cat adopt [name] — adopt from the shelter',
  '/cat switch [name] — change the active cat (no name: the next one)',
  '/cat rename <name> — rename the active cat',
  '/cat reset — start over (wipes everything)',
  '/cat export [file] — save a backup (default: ~/.claude-kitten/backups/)',
  '/cat import <file> — load a backup (your current save is backed up first)',
  '/cat theme <latte|frappe|macchiato|mocha> — switch Claude Code to that Catppuccin theme',
  'In the pane: c s h r b m g tabs · f e n feed/pet/nap · p arcade in the browser · w cat list · a adopt',
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
  const flavorAt = (now: number) => resolveFlavor(String(options.flavor ?? 'auto'), claudeTheme, hourOf(now))
  flavorNow = flavorAt

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cat',
      description: 'Open your AFK cats (/cat hide, /cat adopt [name], /cat switch <name>, /cat rename <name>, /cat export, /cat import <file>, /cat help)',
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
    $.clock.every(TICK_MS, () => void readTheme($).then(() => change($, (h, t) => tick(h, t))))
    // Keeps the arcade server alive; it shuts itself down two minutes after the pings stop.
    $.clock.every(30_000, () => {
      if (!arcade.port) return
      void $.http.fetch(`http://127.0.0.1:${arcade.port}/api/ping`, { method: 'POST', headers: { 'x-arcade-token': arcade.token } })
        .catch(() => undefined)
    })
    $.clock.every(500, () => {
      if (isBandShown) $.ui.invalidate('ui.render')
    })
    $.clock.every(FRAME_MS, async () => {
      if (!latest) return
      frame += 1
      const now = await $.clock.now()
      const cells = frameCells({ home: latest, now, tick: frame, hour: hourOf(now), flavor: flavorAt(now), cols })
      await $.ui.blit({ requestId: PANE, key: SCENE, cells })
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
    if (sub && !['show', 'open', 'rename', 'adopt', 'switch', 'reset'].includes(sub)) return { text: HELP }
    let home: Home
    if (sub === 'rename' && arg) home = await change($, h => rename(h, arg))
    else if (sub === 'adopt') home = await change($, (h, t) => adopt(h, t, Math.random, arg || undefined))
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

  on('tool.call', async ($, e, next) => {
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
    const scene = 'Raster' in ui
      ? <ui.Raster key={SCENE} columns={cols} rows={ROWS}
          cells={frameCells({ home, now, tick: frame, hour: hourOf(now), flavor, cols })} />
      : <Box flexDirection="column">{catArt(mood, home.frame, formOf(cat)).map(line => <Text>{line}</Text>)}</Box>

    const view = (await read($, viewRef)) ?? 'cat'
    const isCatListOpen = (await read($, catListRef)) ?? false
    const tabs = (
      <Box>
        {TABS.map(t => (
          <Button key={`tab-${t.view}`} hotkey={t.hotkey} label={t.view === view ? `▸${t.label}` : t.label}
            variant={t.view === view ? 'primary' : undefined} onPress={() => update($, viewRef, () => t.view)} />
        ))}
      </Box>
    )
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
          <Text>Coats {home.book.coats.length}/9: {COATS.map(c => (home.book.coats.includes(c) ? c : '???')).join(' · ')}</Text>
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
      const next = TIERS[home.tier + 1]
      const hour = hourOf(now)
      const isOpen = isShopOpen(hour)
      const stock = dailyStock(now)
      const placed = new Set(Object.values(home.decor))
      const spare = home.owned.filter(id => !placed.has(id) && furniture(id) && tier.slots.includes(furniture(id)!.slot))
      return (
        <Box flexDirection="column">
          {tabs}
          {scene}
          <Text bold color={tone.title}>
            {tier.name} · {home.cats.length}/{tier.maxCats} cats · {tier.slots.length} decor spots · Coins {Math.floor(home.coins)}
          </Text>
          {home.loan > 0
            ? <Box>
                <Text color={tone.warn}>Tom Mew loan: {Math.ceil(home.loan)}c left ({LOAN_SHARE * 100}% of income pays it) </Text>
                <Button key="pay" plain label="Pay 100c" onPress={() => change($, h => payLoan(h, 100))} />
              </Box>
            : next
              ? <Button key="loan" plain label={`Ask Tom Mew to build a ${next.name} · ${next.loan}c loan · ${next.maxCats} cats`}
                  onPress={() => change($, h => takeLoan(h))} />
              : <Text color={tone.muted}>The finest manor in town.</Text>}
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
            label={`   ${c.id === cat.id ? '●' : '○'} ${c.name} · Lv${c.level} ${stageName(c)} · ${moodOf(c)}`}
            onPress={async () => {
              await change($, h => switchTo(h, c.id))
              await update($, catListRef, () => false)
            }} />
        ))}
        {isCatListOpen && home.cats.length < maxCats(home) && (
          <Text color={tone.muted}>{'   '}+ room for {maxCats(home) - home.cats.length} more · adopt (a)</Text>
        )}
        {stat('Hunger', cat.hunger)}
        {stat('Joy', cat.joy)}
        {stat('Energy', cat.energy)}
        <Text color={tone.accent}>
          XP {bar((cat.xp / xpToNext(cat.level)) * 100, 10)} {cat.xp}/{xpToNext(cat.level)}
        </Text>
        <Text color={tone.coin}>
          Coins {Math.floor(home.coins)} (+{coinRate(home).toFixed(1)}/min)
          {freePoints(cat) > 0 ? ` · ${freePoints(cat)} skill point${freePoints(cat) > 1 ? 's' : ''} to spend (s)` : ''}
        </Text>
        <Text italic color={tone.log}>{home.log}</Text>
        <Box>
          {ACTIONS.map(a => (
            <Button key={a.action} label={a.label} hotkey={a.hotkey}
              onPress={async () => {
                if (a.action !== 'play') return change($, (h, t) => act(h, a.action, t))
                await update($, viewRef, (): View => 'arcade')
                await openArcade($)
              }} />
          ))}
        </Box>
        <Button key="adopt" hotkey="a" plain
          label={home.cats.length < maxCats(home)
            ? `Adopt from the shelter · ${adoptPrice(home)}c · random coat & personality`
            : `House full (${home.cats.length}/${maxCats(home)}) · expand it in Home (h)`}
          onPress={() => change($, (h, t) => adopt(h, t))} />
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
    const tail = [e.props.tail, hintTail(await read($, homeRef))].filter(Boolean).join(' ')
    return next({ ...e, props: { ...e.props, tail } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    isBandShown = false
    if (skin !== 'full' || e.props.hasSurvey || !e.props.isWorking) return next(e)
    isBandShown = true
    const { Text } = $.ui.resolve(e)
    const flavor = flavorAt(await $.clock.now())
    return <Text color={uiTokens(flavor).accent}>{walkFrame(frame, e.props.bodyColumns)}</Text>
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
