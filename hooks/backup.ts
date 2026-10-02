// Save files: export and import a household, and pick up saves another session wrote.
import type { Home } from '../types'
import { migrate } from './game'

export const BACKUP_FORMAT = 1
export type Backup = { app: 'afk-cat'; format: number; exportedAt: string; home: Home }

export const toBackup = (home: Home, now: number) =>
  `${JSON.stringify({ app: 'afk-cat', format: BACKUP_FORMAT, exportedAt: new Date(now).toISOString(), home } satisfies Backup, null, 2)}\n`

// Checks a backup before it replaces anything; the household inside is migrated like any old save.
export const parseBackup = (text: string, now: number): { home: Home } | { error: string } => {
  let data: unknown
  try { data = JSON.parse(text) } catch { return { error: 'the file is not JSON' } }
  if (!data || typeof data !== 'object') return { error: 'the file is not a backup' }
  const b = data as Partial<Backup>
  if (b.app !== 'afk-cat') return { error: 'it is not an afk-cat backup' }
  if (typeof b.format !== 'number' || b.format > BACKUP_FORMAT) return { error: 'it was made by a newer afk-cat; update first' }
  const cats = (b.home as { cats?: unknown } | undefined)?.cats
  if (!Array.isArray(cats) || cats.length === 0) return { error: 'there are no cats in it' }
  return { home: migrate(b.home, now) }
}

const pad = (n: number) => String(n).padStart(2, '0')
export const backupName = (now: number, suffix = '') => {
  const d = new Date(now)
  return `afk-cat-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${suffix}.json`
}
// Backups live under the user's home, spelled with that home's own separator.
const sepOf = (path: string) => (path.includes('\\') ? '\\' : '/')
export const backupDir = (userHome: string | undefined) => {
  const home = (userHome ?? '.').replace(/[\\/]+$/, '')
  return [home, '.claude-kitten', 'backups'].join(sepOf(home))
}
export const inDir = (dir: string, name: string) => `${dir}${sepOf(dir)}${name}`

// Each save carries a revision; a newer one on disk was written by another session, so it wins over ours.
export const pickBase = (stored: unknown, current: Home, now: number): Home => {
  if (!stored || typeof stored !== 'object') return current
  const s = stored as Partial<Home>
  if (s.version !== 3 || typeof s.rev !== 'number' || s.rev <= current.rev) return current
  const fresh = migrate(stored, now)
  // A round the other session has open stays open: its result arrives there.
  return { ...fresh, arcade: { ...fresh.arcade, open: s.arcade?.open ?? null } }
}
