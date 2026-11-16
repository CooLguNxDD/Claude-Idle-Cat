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
  const problem = saveProblem(b.home, now)
  if (problem) return { error: problem }
  return { home: migrate(b.home, now) }
}

// Why a stored household can't be loaded, or '' when it can. Legacy v1 saves lived under the old 'cat' key.
export const saveProblem = (saved: unknown, now: number, isLegacy = false): string => {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return 'the save is not a household'
  const s = saved as { version?: unknown; rev?: unknown; coins?: unknown; cats?: unknown }
  if (isLegacy && s.version === undefined) return ''
  if (typeof s.version === 'number' && s.version > 3) return 'it was made by a newer afk-cat'
  if (s.version !== 2 && s.version !== 3) return 'the save has no known version'
  if (!Array.isArray(s.cats) || s.cats.length === 0) return 'there are no cats in it'
  if (!s.cats.every(c => !!c && typeof c === 'object' && typeof (c as { id?: unknown }).id === 'string')) return 'a cat in it is damaged'
  if (typeof s.coins !== 'number' || !Number.isFinite(s.coins)) return 'its coins are damaged'
  if (s.version === 3 && (typeof s.rev !== 'number' || !Number.isFinite(s.rev))) return 'its revision is damaged'
  try {
    if (migrate(saved, now).cats.length === 0) return 'there are no cats in it'
  } catch {
    return 'the save could not be read'
  }
  return ''
}

// The newest backup that still loads, by its export time; damaged copies are never candidates.
export const isRecoveryCandidate = (name: string) => /^afk-cat-.*\.json$/.test(name) && !name.includes('-damaged')
export const pickRecovery = (files: { name: string; text: string }[], now: number): { home: Home; name: string } | undefined => {
  let best: { home: Home; name: string; at: number } | undefined
  for (const f of files) {
    if (!isRecoveryCandidate(f.name)) continue
    const parsed = parseBackup(f.text, now)
    if ('error' in parsed) continue
    const at = Date.parse((JSON.parse(f.text) as Backup).exportedAt) || 0
    if (!best || at > best.at) best = { home: parsed.home, name: f.name, at }
  }
  return best && { home: best.home, name: best.name }
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
  // A damaged save never replaces a good one, however new its revision claims to be.
  if (saveProblem(stored, now)) return current
  const fresh = migrate(stored, now)
  // A round the other session has open stays open: its result arrives there.
  return { ...fresh, arcade: { ...fresh.arcade, open: s.arcade?.open ?? null } }
}

// Auto backups rotate through one file per weekday, so the folder never grows.
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const AUTO_BACKUP_MS = 30 * 60_000
export const autoBackupName = (now: number) => `afk-cat-auto-${WEEKDAYS[new Date(now).getDay()]}.json`
export const isAutoBackupDue = (lastAt: number, now: number) => !lastAt || now < lastAt || now - lastAt >= AUTO_BACKUP_MS
