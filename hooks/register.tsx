import { read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Home } from '../types'
import { catArt } from './art'
import { SHOP, act, activeCat, adopt, adoptPrice, bar, buy, checkIn, coinRate, migrate, moodOf, newHome, priceOf,
  rename, reward, stageOf, switchTo, tick, xpToNext } from './game'
import type { Action, Item } from './game'
import { PERSONALITY_INFO, describeGenes } from './genes'
import { ROWS, frameCells, sceneCols } from './scene'
import { resolveFlavor, uiTokens } from './theme'

const PANE = 'afk-cat'
const SCENE = 'scene'
const TICK_MS = 10_000
const FRAME_MS = 125
const homeRef = { plugin: 'afk-cat', key: 'home' } as const

// Latest home and scene width for the animation loop, which repaints without a render pass.
let latest: Home | null = null
let cols = 34
let frame = 0
// Claude Code's own theme row, read for the `auto` flavor.
let claudeTheme = 'dark'

// Applies a change to the household, then saves it so it survives restarts.
const change = async ($: EngineInterface, fn: (home: Home, now: number) => Home) => {
  const now = await $.clock.now()
  let home!: Home
  await update($, homeRef, prev => (home = fn(prev ?? newHome(now), now)))
  latest = home
  await $.store.set('home', home)
  const cat = activeCat(home)
  $.ui.status(`🐱 ${cat.name} Lv${cat.level} ${moodOf(cat)} · ${Math.floor(home.coins)}c`)
  return home
}

const ACTIONS: { action: Action; label: string; hotkey: string }[] = [
  { action: 'feed', label: 'Feed 5c', hotkey: 'f' },
  { action: 'play', label: 'Play', hotkey: 'p' },
  { action: 'pet', label: 'Pet', hotkey: 'e' },
  { action: 'nap', label: 'Nap/Wake', hotkey: 'n' },
]
const ITEMS: { item: Item; hotkey: string }[] = [
  { item: 'feeder', hotkey: '1' }, { item: 'toy', hotkey: '2' }, { item: 'bed', hotkey: '3' },
]

const hourOf = (now: number) => new Date(now).getHours()

const readTheme = async ($: EngineInterface) => {
  const row = (await $.config.list()).find(r => r.key === 'theme')
  claudeTheme = typeof row?.value === 'string' ? row.value : 'dark'
}

export const register: Register = (on, options) => {
  const flavorAt = (now: number) => resolveFlavor(String(options.flavor ?? 'auto'), claudeTheme, hourOf(now))

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cat',
      description: 'Open your AFK cats (/cat adopt [name], /cat switch <name>, /cat rename <name>, /cat reset)',
    })
    await readTheme($)
    const saved = (await $.store.get('home')) ?? (await $.store.get('cat'))
    const before = (saved as { coins?: number } | undefined)?.coins ?? 0
    let bonus = 0
    const home = await change($, (_, t) => {
      const day = checkIn(tick(migrate(saved, t), t), t)
      bonus = day.bonus
      return day.home
    })
    const earned = Math.floor(home.coins - before - bonus)
    if (saved && earned > 0) $.ui.toast(`The cats earned ${earned}c while you were away`)
    if (bonus > 0) $.ui.toast(`Day ${home.streak} streak bonus: +${bonus}c`)
    $.clock.every(TICK_MS, () => void readTheme($).then(() => change($, (h, t) => tick(h, t))))
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
    const [sub, ...rest] = e.args.trim().split(/\s+/)
    const arg = rest.join(' ')
    if (sub === 'rename' && arg) await change($, h => rename(h, arg))
    else if (sub === 'adopt') await change($, (h, t) => adopt(h, t, Math.random, arg || undefined))
    else if (sub === 'switch' && arg) await change($, h => switchTo(h, arg))
    else if (sub === 'reset') await change($, (_, t) => newHome(t))
    else await change($, h => h)
    await $.ui.open({ id: PANE, title: 'AFK Cat' })
    return { text: 'Your cats are in the pane.' }
  })

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const set = await next(e)
    await readTheme($)
    $.ui.invalidate('ui.render')
    return set
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    void change($, h => reward(h, 1))
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    void change($, (h, t) => ({ ...reward(h, 3, 2, t), effect: { kind: 'coins', at: t } }))
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
      : <Box flexDirection="column">{catArt(mood, home.frame).map(line => <Text>{line}</Text>)}</Box>

    return (
      <Box flexDirection="column">
        <Text bold color={tone.title}>
          {cat.name} · Lv {cat.level} {stageOf(cat.level)} · {mood}
          {home.streak > 1 ? ` · 🔥${home.streak}d` : ''}
        </Text>
        <Text color={tone.muted}>{describeGenes(cat.genes)} — {PERSONALITY_INFO[cat.genes.personality]}</Text>
        {scene}
        {home.cats.length > 1 && (
          <Box>
            {home.cats.map(c => (
              <Button key={`cat-${c.id}`} plain label={c.id === cat.id ? `▸${c.name}` : c.name}
                onPress={() => change($, h => switchTo(h, c.id))} />
            ))}
          </Box>
        )}
        {stat('Hunger', cat.hunger)}
        {stat('Joy', cat.joy)}
        {stat('Energy', cat.energy)}
        <Text color={tone.accent}>
          XP {bar((cat.xp / xpToNext(cat.level)) * 100, 10)} {cat.xp}/{xpToNext(cat.level)}
        </Text>
        <Text color={tone.coin}>Coins {Math.floor(home.coins)} (+{coinRate(home).toFixed(1)}/min)</Text>
        <Text italic color={tone.log}>{home.log}</Text>
        <Box>
          {ACTIONS.map(a => (
            <Button key={a.action} label={a.label} hotkey={a.hotkey}
              onPress={() => change($, (h, t) => act(h, a.action, t))} />
          ))}
        </Box>
        <Text color={tone.muted}>Shop</Text>
        <Box flexDirection="column">
          {ITEMS.map(({ item, hotkey }) => (
            <Button key={item} hotkey={hotkey} plain
              label={`${SHOP[item].label} lv${home.upgrades[item]} · ${priceOf(home, item)}c · ${SHOP[item].perk}`}
              onPress={() => change($, (h, t) => buy(h, item, t))} />
          ))}
          <Button key="adopt" hotkey="a" plain
            label={home.cats.length < home.maxCats
              ? `Adopt a cat · ${adoptPrice(home)}c · random coat & personality`
              : `House full (${home.cats.length}/${home.maxCats})`}
            onPress={() => change($, (h, t) => adopt(h, t))} />
        </Box>
      </Box>
    )
  })
}
