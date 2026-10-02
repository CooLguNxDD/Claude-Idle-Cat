import { read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Cat } from '../types'
import { catArt } from './art'
import { SHOP, act, bar, buy, checkIn, coinRate, moodOf, newCat, normalize, priceOf, reward, stageOf, tick,
  xpToNext } from './game'
import type { Action, Item } from './game'
import { COLS, ROWS, frameCells } from './sprite'
import { resolveFlavor, uiTokens } from './theme'

const PANE = 'afk-cat'
const SCENE = 'scene'
const TICK_MS = 10_000
const FRAME_MS = 125
const catRef = { plugin: 'afk-cat', key: 'cat' } as const

// Latest cat for the animation loop, which repaints without a render pass.
let latest: Cat | null = null
let frame = 0
// Claude Code's own theme row, read for the `auto` flavor.
let claudeTheme = 'dark'

// Applies a change to the cat, then saves it so it survives restarts.
const change = async ($: EngineInterface, fn: (cat: Cat, now: number) => Cat) => {
  const now = await $.clock.now()
  let cat!: Cat
  await update($, catRef, prev => (cat = fn(prev ?? newCat(now), now)))
  latest = cat
  await $.store.set('cat', cat)
  $.ui.status(`🐱 ${cat.name} Lv${cat.level} ${moodOf(cat)} · ${Math.floor(cat.coins)}c`)
  return cat
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
    await $.command.register({ name: 'cat', description: 'Open your AFK cat (/cat rename <name>, /cat reset)' })
    await readTheme($)
    const saved = (await $.store.get('cat')) as Partial<Cat> | undefined
    const before = saved?.coins ?? 0
    let bonus = 0
    const cat = await change($, (_, t) => {
      const day = checkIn(tick(saved ? normalize(saved, t) : newCat(t), t), t)
      bonus = day.bonus
      return day.cat
    })
    const earned = Math.floor(cat.coins - before - bonus)
    if (saved && earned > 0) $.ui.toast(`${cat.name} earned ${earned}c while you were away`)
    if (bonus > 0) $.ui.toast(`Day ${cat.streak} streak bonus: +${bonus}c`)
    $.clock.every(TICK_MS, () => void readTheme($).then(() => change($, (c, t) => tick(c, t))))
    $.clock.every(FRAME_MS, async () => {
      if (!latest) return
      frame += 1
      const now = await $.clock.now()
      await $.ui.blit({ requestId: PANE, key: SCENE, cells: frameCells(latest, now, frame, hourOf(now), flavorAt(now)) })
    })
    return next(e)
  })

  on('command.run', { command: 'cat' }, async ($, e) => {
    const [sub, ...rest] = e.args.trim().split(/\s+/)
    if (sub === 'rename' && rest.length > 0) {
      const name = rest.join(' ').slice(0, 20)
      await change($, c => ({ ...c, name, log: `Say hi to ${name}!` }))
    } else if (sub === 'reset') {
      await change($, (_, t) => newCat(t))
    } else {
      await change($, c => c)
    }
    await $.ui.open({ id: PANE, title: 'AFK Cat' })
    return { text: 'Your cat is in the pane.' }
  })

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const set = await next(e)
    await readTheme($)
    $.ui.invalidate('ui.render')
    return set
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    void change($, c => reward(c, 1))
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    void change($, (c, t) => ({ ...reward(c, 3, 2, t), effect: { kind: 'coins', at: t } }))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const cat = await read($, catRef)
    if (!cat) return <Text dimColor>Your cat is waking up…</Text>
    const now = await $.clock.now()
    const mood = moodOf(cat)
    const flavor = flavorAt(now)
    const tone = uiTokens(flavor)
    const stat = (label: string, n: number) => (
      <Text color={n < 20 ? tone.bad : n < 50 ? tone.warn : tone.ok}>
        {label.padEnd(7)}{bar(n)} {String(Math.round(n)).padStart(3)}
      </Text>
    )
    const scene = 'Raster' in ui
      ? <ui.Raster key={SCENE} columns={COLS} rows={ROWS} cells={frameCells(cat, now, frame, hourOf(now), flavor)} />
      : <Box flexDirection="column">{catArt(mood, cat.frame).map(line => <Text>{line}</Text>)}</Box>

    return (
      <Box flexDirection="column">
        <Text bold color={tone.title}>
          {cat.name} · Lv {cat.level} {stageOf(cat.level)} · {mood}
          {cat.streak > 1 ? ` · 🔥${cat.streak}d` : ''}
        </Text>
        {scene}
        {stat('Hunger', cat.hunger)}
        {stat('Joy', cat.joy)}
        {stat('Energy', cat.energy)}
        <Text color={tone.accent}>
          XP {bar((cat.xp / xpToNext(cat.level)) * 100, 10)} {cat.xp}/{xpToNext(cat.level)}
        </Text>
        <Text color={tone.coin}>Coins {Math.floor(cat.coins)} (+{coinRate(cat).toFixed(1)}/min)</Text>
        <Text italic color={tone.log}>{cat.log}</Text>
        <Box>
          {ACTIONS.map(a => (
            <Button key={a.action} label={a.label} hotkey={a.hotkey}
              onPress={() => change($, (c, t) => act(c, a.action, t))} />
          ))}
        </Box>
        <Text color={tone.muted}>Shop</Text>
        <Box flexDirection="column">
          {ITEMS.map(({ item, hotkey }) => (
            <Button key={item} hotkey={hotkey} plain
              label={`${SHOP[item].label} lv${cat.upgrades[item]} · ${priceOf(cat, item)}c · ${SHOP[item].perk}`}
              onPress={() => change($, (c, t) => buy(c, item, t))} />
          ))}
        </Box>
      </Box>
    )
  })
}
