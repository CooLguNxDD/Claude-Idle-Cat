import type { Cat, Home } from '../types'
import { bowlOf } from './bowl'
import { SPEECH } from './content'
import type { Speech, SpeechTrigger } from './content/types'
import { decorate, friendLevel, giftById, dayOf } from './friends'
import { AUTO_FEED_LOG, activeCat, moodOf } from './game'
import { bondLevel } from './pair'
import { seeded } from './rng'
import type { Rng } from './rng'

export type SpeechEvent = { on: SpeechTrigger; catId: string; about?: readonly string[]; role?: 'lead' | 'partner'
  buddyId?: string; vars?: Record<string, string> }
export type Said = { catId: string; text: string; glyph?: Speech['glyph']; at: number; until: number; priority: number }

const WORLD = new Set<SpeechTrigger>(['weather', 'festival', 'stray', 'catch', 'welcome'])
const BRAIN = new Set<SpeechTrigger>(['plan', 'done', 'bowl.empty', 'wake', 'pair.start', 'pair.end'])
const priorityOf = (on: SpeechTrigger) => on === 'idle' ? 0 : WORLD.has(on) ? 1 : BRAIN.has(on) ? 2 : 3
const inHours = (hours: readonly [number, number] | undefined, hour: number) => {
  if (!hours) return true
  const [from, to] = hours
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to
}
const idHash = (id: string) => [...id].reduce((n, ch) => (n * 33 + ch.charCodeAt(0)) >>> 0, 7)

const fill = (line: string, vars: Record<string, string>): string | null => {
  const missing = [...line.matchAll(/\{(\w+)\}/g)].some(m => !vars[m[1] ?? ''])
  return missing ? null : line.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

const eligible = (bank: Speech, ev: SpeechEvent, cat: Cat, home: Home, hour: number) => {
  if (bank.on !== ev.on || bank.when.weight <= 0) return false
  if (bank.about?.length && !ev.about?.some(id => bank.about!.includes(id))) return false
  if (bank.role && bank.role !== ev.role) return false
  const when = bank.when
  if (when.personality && !when.personality.includes(cat.genes.personality)) return false
  if (when.moods && !when.moods.includes(moodOf(cat))) return false
  if (when.minFriend !== undefined && friendLevel(cat.friendship) < when.minFriend) return false
  if (when.minBond !== undefined && (!ev.buddyId || bondLevel(home, cat.id, ev.buddyId) < when.minBond)) return false
  if (when.minBowl !== undefined && bowlOf(home).cap < when.minBowl) return false
  return inHours(when.hours, hour)
}

const pickBank = (pool: readonly Speech[], rng: Rng): Speech | undefined => {
  let roll = rng() * pool.reduce((sum, bank) => sum + bank.when.weight, 0)
  for (const bank of pool) if ((roll -= bank.when.weight) < 0) return bank
  return pool[pool.length - 1]
}

/** One line for this event, or null when nothing fits. Recent lines are skipped while another remains; else one repeats. */
export const speak = (home: Home, ev: SpeechEvent, now: number, hour: number, rng: Rng, recent: readonly string[]): Said | null => {
  const cat = home.cats.find(c => c.id === ev.catId)
  if (!cat) return null
  const buddy = ev.buddyId ? home.cats.find(c => c.id === ev.buddyId)?.name ?? ev.vars?.buddy ?? '' : ev.vars?.buddy ?? ''
  const vars = { name: cat.name, buddy, food: '', gift: '', tool: '', weather: '', bowl: bowlOf(home).name, ...ev.vars }
  const filled = SPEECH.filter(bank => eligible(bank, ev, cat, home, hour))
    .map(bank => ({ bank, lines: bank.lines.map(line => fill(line, vars)).filter((line): line is string => !!line) }))
    .filter(row => row.lines.length)
  const fresh = filled.map(row => ({ ...row, lines: row.lines.filter(line => !recent.includes(line)) })).filter(row => row.lines.length)
  const rows = fresh.length ? fresh : filled
  const bank = pickBank(rows.map(row => row.bank), rng)
  const lines = rows.find(row => row.bank === bank)?.lines ?? []
  const choice = lines[Math.floor(rng() * lines.length)]
  if (!bank || !choice) return null
  const text = decorate(cat, choice, hour + idHash(cat.id))
  const hold = Math.max(4_000, Math.min(9_000, text.length * 90))
  return { catId: cat.id, text, glyph: bank.glyph, at: now, until: now + hold, priority: priorityOf(ev.on) }
}

const effectEvent = (before: Home, after: Home): SpeechEvent | null => {
  if (!after.effect || after.effect === before.effect) return null
  const catId = activeCat(after).id
  const kind = after.effect.kind
  if (kind === 'hearts') return { on: 'pet', catId }
  if (kind === 'yarn') return { on: 'play', catId }
  if (kind === 'fish' && after.bowl.food > before.bowl.food && after.log !== AUTO_FEED_LOG) return { on: 'fill', catId, vars: { food: String(after.bowl.food), bowl: bowlOf(after).name } }
  if (kind === 'gift') {
    const cat = activeCat(after)
    const gift = cat.lastGift ? giftById(cat.lastGift.id) : undefined
    const loved = !!gift && gift.loves === cat.genes.personality
    return { on: loved ? 'gift.loved' : 'gift', catId, ...(gift ? { about: [gift.id], vars: { gift: gift.name } } : {}) }
  }
  if (kind === 'levelup' || kind === 'evolve') return { on: 'levelup', catId }
  if (kind === 'catch') return { on: 'catch', catId }
  if (kind === 'welcome') return { on: 'welcome', catId }
  return null
}

/** Save diff the household can speak about. Same idea as achievement detection in change(). */
export const eventsOf = (before: Home, after: Home, _now: number): SpeechEvent[] => {
  const events: SpeechEvent[] = []
  const effect = effectEvent(before, after)
  if (effect) events.push(effect)
  for (const cat of after.cats) {
    const prev = before.cats.find(c => c.id === cat.id)
    if (prev?.isAsleep && !cat.isAsleep) events.push({ on: 'wake', catId: cat.id })
  }
  if (after.visitors.length > before.visitors.length) events.push({ on: 'stray', catId: activeCat(after).id })
  return events
}

const quoteBanks = (cat: Cat, now: number): Speech[] => {
  const gift = cat.lastGift ? giftById(cat.lastGift.id) : undefined
  const onGiftDay = !!gift && !!cat.lastGift && dayOf(now) - cat.lastGift.day === 0
  return SPEECH.filter(bank => bank.on === 'idle' || (onGiftDay && (bank.on === 'gift' || bank.on === 'gift.loved') && (!bank.about?.length || bank.about.includes(gift.id))))
}

/** Fresh spoken line, else an idle (or gift-day) line stable for the hour. */
export const quoteOf = (home: Home, said: Said | null, now: number, hour: number): { catId: string; text: string } => {
  if (said && now < said.until && home.cats.some(c => c.id === said.catId)) return { catId: said.catId, text: said.text }
  const cat = activeCat(home)
  const gift = cat.lastGift ? giftById(cat.lastGift.id) : undefined
  const onGiftDay = !!gift && !!cat.lastGift && dayOf(now) - cat.lastGift.day === 0
  const ev: SpeechEvent = { on: 'idle', catId: cat.id, ...(onGiftDay && gift ? { about: [gift.id], vars: { gift: gift.name } } : {}) }
  const banks = quoteBanks(cat, now).filter(bank => bank.on === 'idle' ? eligible({ ...bank, on: 'idle' }, ev, cat, home, hour) : eligible(bank, { ...ev, on: bank.on }, cat, home, hour))
  const rng = seeded(dayOf(now) * 24 + hour + idHash(cat.id))
  const bank = banks.length ? pickBank(banks, rng) : undefined
  const vars = { name: cat.name, buddy: '', food: '', gift: gift?.name ?? '', tool: '', weather: '' }
  const lines = (bank?.lines ?? []).map(line => fill(line, vars)).filter((line): line is string => !!line)
  const text = lines.length ? decorate(cat, lines[Math.floor(rng() * lines.length)]!, hour + idHash(cat.id)) : '…'
  return { catId: cat.id, text }
}
