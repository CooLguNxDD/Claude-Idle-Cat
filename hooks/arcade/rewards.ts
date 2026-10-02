// Arcade economy: rounds cost energy, medals pay minutes of idle income, three paid plays per game a day.
import type { Arcade, Cat, GameId, Home } from '../../types'
import { track } from '../collection'
import { befriend, dayOf } from '../friends'
import { activeCat, coinRate, reward } from '../game'
import { seeded } from '../rng'
import { branchPoints } from '../skills'
import type { GameMods } from './game'
import { GAMES, gameOf, isGameId } from './games'
import { medalOf } from './medals'
import type { Medal } from './medals'

export const ENERGY_COST = 10
export const PAID_PLAYS = 3
// A medal pays this many minutes of the household's idle income, plus a floor for small homes.
const MINUTES: Record<Medal, number> = { bronze: 3, silver: 6, gold: 10 }
const FLOOR: Record<Medal, number> = { bronze: 5, silver: 10, gold: 20 }
const XP: Record<Medal, number> = { bronze: 3, silver: 6, gold: 10 }
// Extra milliseconds allowed between the round's start and the posted result.
const SLACK_MS = 3000

export const featured = (now: number): GameId =>
  GAMES[Math.floor(seeded(dayOf(now) * 313 + 7)() * GAMES.length)]?.id ?? 'dash'

export const modsFor = (cat: Cat): GameMods => ({
  hunter: branchPoints(cat, 'hunter'), cuddler: branchPoints(cat, 'cuddler'), dreamer: branchPoints(cat, 'dreamer'),
})

const today = (a: Arcade, now: number): Arcade => (a.day === dayOf(now) ? a : { ...a, day: dayOf(now), plays: {} })
export const playsLeft = (home: Home, id: GameId, now: number) =>
  Math.max(0, PAID_PLAYS - (today(home.arcade, now).plays[id] ?? 0))

const withActive = (home: Home, fn: (cat: Cat) => Cat): Home =>
  ({ ...home, cats: home.cats.map(c => (c.id === home.activeId ? fn(c) : c)) })
const clamp = (n: number) => Math.max(0, Math.min(100, n))

export const startGame = (home: Home, id: GameId, now: number): Home => {
  const cat = activeCat(home)
  const game = gameOf(id)
  if (!game) return home
  if (cat.isAsleep) return { ...home, log: `${cat.name} is asleep. Wake them first (n).` }
  if (cat.energy < ENERGY_COST) return { ...home, log: `${cat.name} is too tired for ${game.name}. Let them nap.` }
  return withActive({ ...home, arcade: { ...today(home.arcade, now), open: { game: id, at: now } },
    log: `${cat.name} gets ready for ${game.name}!` }, c => ({ ...c, energy: clamp(c.energy - ENERGY_COST) }))
}

export const quitGame = (home: Home): Home =>
  home.arcade.open ? { ...home, arcade: { ...home.arcade, open: null }, log: 'Round abandoned. Maybe later!' } : home

export type ArcadeMessage = { kind: 'quit'; game: GameId } | { kind: 'result'; game: GameId; score: number; ms: number }

// A Client's post is untrusted code output: only well-formed messages get through.
export const parseMessage = (data: unknown): ArcadeMessage | null => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (!isGameId(d.game)) return null
  if (d.kind === 'quit') return { kind: 'quit', game: d.game }
  if (d.kind !== 'result' || typeof d.score !== 'number' || typeof d.ms !== 'number') return null
  if (!Number.isFinite(d.score) || !Number.isFinite(d.ms)) return null
  return { kind: 'result', game: d.game, score: d.score, ms: d.ms }
}

// Pays a finished round, only for the round that was started; the score is clamped to what its time allows.
export const finishGame = (home: Home, game: GameId, posted: number, postedMs: number, now: number): Home => {
  const open = home.arcade.open
  const g = gameOf(game)
  if (!open || open.game !== game || !g) return home
  const ms = Math.max(0, Math.min(postedMs, now - open.at + SLACK_MS, g.seconds * 1000 + SLACK_MS))
  const score = Math.max(0, Math.min(Math.floor(posted), g.maxScore(ms)))
  const arcade = today(home.arcade, now)
  const isPaid = (arcade.plays[game] ?? 0) < PAID_PLAYS
  const isFeatured = featured(now) === game
  const medal = medalOf(g, score)
  const isBest = score > (arcade.best[game] ?? 0)
  const coins = isPaid && medal ? Math.round(Math.max(FLOOR[medal], coinRate(home) * MINUTES[medal]) * (isFeatured ? 2 : 1)) : 0
  const xp = isPaid && medal ? XP[medal] : 0
  const joy = 15 + Math.min(15, Math.floor((score / g.medals[2]) * 15))
  const cat = activeCat(home)
  const parts = [
    `${cat.name} scored ${score} in ${g.name}`,
    medal ? `${medal} medal` : 'no medal',
    coins ? `+${coins}c${isFeatured ? ' (2× featured)' : ''}` : isPaid ? '' : 'no coins (3 paid plays used today)',
    xp ? `+${xp}xp` : '',
    `+${joy} joy`,
    isBest ? 'new best!' : '',
  ].filter(Boolean)
  const next: Home = withActive({
    ...home,
    arcade: { ...arcade, open: null, plays: { ...arcade.plays, [game]: (arcade.plays[game] ?? 0) + 1 },
      best: { ...arcade.best, [game]: Math.max(score, arcade.best[game] ?? 0) }, golds: arcade.golds + (medal === 'gold' ? 1 : 0) },
    effect: { kind: medal === 'gold' ? 'award' : medal ? 'medal' : 'yarn', at: now },
    log: parts.join(' · ').replace(/([^!])$/, '$1.'),
  }, c => befriend({ ...c, joy: clamp(c.joy + joy) }, medal ? 3 : 1, now))
  return track(reward(next, coins, xp, now), 'games', 1, now)
}
