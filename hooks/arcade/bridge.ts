// What the mod and the browser arcade exchange through the local server: snapshots one way, round events back.
import type { GameId, Genes, Home } from '../../types'
import { activeCat } from '../game'
import type { FlavorName } from '../theme'
import type { GameMods } from './game'
import { GAMES, isGameId } from './games'
import { PAID_PLAYS, featured, modsFor, parseMessage, playsLeft } from './rewards'
import type { ArcadeMessage } from './rewards'
import { validCoordinates } from '../weather/location'

export type MenuGame = { id: GameId; name: string; blurb: string; controls: string; best: number; left: number; medals: number[] }
export type Prefs = Home['prefs']
export type Menu = {
  cat: string; energy: number; log: string; flavor: FlavorName; featured: GameId; paidPlays: number; games: MenuGame[]; prefs: Prefs
}
export type Round = { id: number; game: GameId; seed: number; mods: GameMods; genes: Genes; best: number }
export type Snapshot = { menu: Menu; round: Round | null }

export const snapshotOf = (home: Home, now: number, flavor: FlavorName): Snapshot => {
  const cat = activeCat(home)
  const open = home.arcade.open
  return {
    menu: {
      cat: cat.name, energy: cat.energy, log: home.log, flavor, featured: featured(now), paidPlays: PAID_PLAYS, prefs: home.prefs,
      games: GAMES.map(g => ({ id: g.id, name: g.name, blurb: g.blurb, controls: g.controls,
        best: home.arcade.best[g.id] ?? 0, left: playsLeft(home, g.id, now), medals: [...g.medals] })),
    },
    round: open ? { id: open.at, game: open.game, seed: open.at % 2_147_483_647, mods: modsFor(cat), genes: cat.genes,
      best: home.arcade.best[open.game] ?? 0 } : null,
  }
}

export type ServerLine = { kind: 'ready'; port: number } | ArcadeMessage | { kind: 'start'; game: GameId }
  | { kind: 'prefs'; prefs: Prefs } | { kind: 'location'; latitude: number; longitude: number }

// One stdout line from the server; anything else it prints is ignored.
export const parseLine = (line: string): ServerLine | null => {
  let data: unknown
  try { data = JSON.parse(line) } catch { return null }
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.kind === 'location') return validCoordinates(d.latitude, d.longitude)
    ? { kind: 'location', latitude: d.latitude as number, longitude: d.longitude as number } : null
  if (d.kind === 'ready') return Number.isInteger(d.port) && (d.port as number) > 0 ? { kind: 'ready', port: d.port as number } : null
  if (d.kind === 'start') return isGameId(d.game) ? { kind: 'start', game: d.game } : null
  if (d.kind === 'prefs') return typeof d.glow === 'boolean' && typeof d.crt === 'boolean' ? { kind: 'prefs', prefs: { glow: d.glow, crt: d.crt } } : null
  return parseMessage(d)
}

// Stdout arrives in pieces, not lines: keep the unfinished tail for the next piece.
export const splitLines = (buffer: string, text: string): { lines: string[]; rest: string } => {
  const parts = (buffer + text).split('\n')
  return { lines: parts.slice(0, -1).map(l => l.trim()).filter(Boolean), rest: parts[parts.length - 1] ?? '' }
}

export const newToken = (rng: () => number) =>
  Array.from({ length: 4 }, () => Math.floor(rng() * 0x1_0000_0000).toString(16).padStart(8, '0')).join('')

// Links may only name localhost; the server answers to it and to 127.0.0.1.
export const arcadeUrl = (port: number, token: string) => `http://localhost:${port}/?t=${token}`

// How to open a URL in the default browser, per platform.
export const browserArgv = (isWindows: boolean, url: string): string[][] =>
  isWindows ? [['rundll32', 'url.dll,FileProtocolHandler', url]] : [['open', url], ['xdg-open', url]]
