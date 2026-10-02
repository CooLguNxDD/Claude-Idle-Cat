import { read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Home, View } from '../types'
import { catArt } from './art'
import { ACHIEVEMENTS, MILES_SHOP, buyWithMiles, settle, tasksFor, track } from './collection'
import { CRITTERS, critter, isAvailable, sell } from './critters'
import { act, activeCat, adopt, adoptPrice, adoptVisitor, bar, buyItem, checkIn, coinRate, donateCritter, giveGift,
  learnSkill, migrate, moodOf, newHome, rename, respec, reward, stageName, switchTo, tick, welcomeBack,
  xpToNext } from './game'
import { CATCHPHRASE_LEVEL, DAILY_CAP, GIFTS, LEVELS, NICKNAME_LEVEL, PHOTO_LEVEL, dayOf, dialogue, friendLevel,
  levelName, toNextLevel } from './friends'
import type { Action } from './game'
import { PERSONALITY_INFO, describeGenes } from './genes'
import type { Coat } from '../types'
import { LOAN_SHARE, SHOP_CLOSE, SHOP_OPEN, TIERS, baitOf, dailyStock, furniture, isShopOpen, maxCats, payLoan, place,
  takeLoan, tierOf } from './home'
import { ROWS, frameCells, sceneCols } from './scene'
import { BRANCHES, FORM_LEVEL, SKILLS, branchPoints, canLearn, formOf, freePoints, rankOf, respecPrice } from './skills'
import type { Branch } from './skills'
import { resolveFlavor, uiTokens } from './theme'

const PANE = 'afk-cat'
const SCENE = 'scene'
const TICK_MS = 10_000
const FRAME_MS = 125
const homeRef = { plugin: 'afk-cat', key: 'home' } as const
const viewRef = { plugin: 'afk-cat', key: 'view' } as const
const TABS: { view: View; label: string; hotkey: string }[] = [
  { view: 'cat', label: 'Cat', hotkey: 'c' },
  { view: 'skills', label: 'Skills', hotkey: 's' },
  { view: 'home', label: 'Home', hotkey: 'h' },
  { view: 'friends', label: 'Friends', hotkey: 'r' },
  { view: 'book', label: 'Book', hotkey: 'b' },
  { view: 'miles', label: 'Miles', hotkey: 'm' },
]
const COATS: Coat[] = ['ginger', 'tabby', 'grey', 'black', 'white', 'cream', 'calico', 'tuxedo', 'siamese']
const FORMS = ['ninja', 'royal', 'cloud', 'chonk']

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
  let before!: Home
  await update($, homeRef, prev => {
    before = prev ?? newHome(now)
    return (home = settle(fn(before, now), now))
  })
  latest = home
  for (const a of ACHIEVEMENTS) if (!(a.id in before.achievements) && a.id in home.achievements) $.ui.toast(`🏆 ${a.name}: ${a.text} (+${a.miles} miles)`)
  for (const t of tasksFor(now)) {
    if (!before.miles.done.includes(t.id) && home.miles.done.includes(t.id) && home.miles.day === before.miles.day) {
      $.ui.toast(`🐾 ${t.text} (+${t.miles} miles)`)
    }
  }
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
        <Text color={tone.coin}>
          Coins {Math.floor(home.coins)} (+{coinRate(home).toFixed(1)}/min)
          {freePoints(cat) > 0 ? ` · ${freePoints(cat)} skill point${freePoints(cat) > 1 ? 's' : ''} to spend (s)` : ''}
        </Text>
        <Text italic color={tone.log}>{home.log}</Text>
        <Box>
          {ACTIONS.map(a => (
            <Button key={a.action} label={a.label} hotkey={a.hotkey}
              onPress={() => change($, (h, t) => act(h, a.action, t))} />
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
}
