import { expect, mock, test } from 'claude-code/testing'

import {
  AUTO_BACKUP_MS, autoBackupName, backupDir, backupName, isAutoBackupDue, parseBackup, pickBase, pickRecovery, saveProblem, toBackup,
} from './backup'
import { adopt, newHome } from './game'
import { seeded } from './rng'

const t = new Date(2026, 9, 2, 14, 5).getTime()

test('a backup round-trips, and bad files are refused with a reason', async () => {
  const home = { ...adopt({ ...newHome(t), coins: 500 }, t, seeded(3)), rev: 12 }
  const back = parseBackup(toBackup(home, t), t)
  expect('home' in back && back.home.cats.map(c => c.name)).toEqual(home.cats.map(c => c.name))
  expect('home' in back && back.home.coins).toBe(home.coins)
  expect(parseBackup('not json', t)).toEqual({ error: 'the file is not JSON' })
  expect(parseBackup('{"app":"other"}', t)).toEqual({ error: 'it is not an afk-cat backup' })
  expect(parseBackup('{"app":"afk-cat","format":9,"home":{}}', t)).toEqual({ error: 'it was made by a newer afk-cat; update first' })
  expect(parseBackup('{"app":"afk-cat","format":1,"home":{"cats":[]}}', t)).toEqual({ error: 'there are no cats in it' })
  expect(backupName(t)).toBe('afk-cat-2026-10-02-1405.json')
  expect(backupName(t, '-before-import')).toBe('afk-cat-2026-10-02-1405-before-import.json')
  expect(backupDir('C:\\Users\\me\\')).toBe('C:\\Users\\me\\.claude-kitten\\backups')
  expect(backupDir('/home/me')).toBe('/home/me/.claude-kitten/backups')
})

test('a newer save from another session wins; an older or missing one does not', async () => {
  const mine = { ...newHome(t), rev: 5, coins: 10 }
  const theirs = { ...newHome(t), rev: 9, coins: 999, arcade: { ...newHome(t).arcade, open: { game: 'dash' as const, at: t } } }
  const picked = pickBase(theirs, mine, t)
  expect(picked.coins).toBe(999)
  expect(picked.arcade.open?.game).toBe('dash')
  expect(pickBase({ ...theirs, rev: 4 }, mine, t)).toBe(mine)
  expect(pickBase(undefined, mine, t)).toBe(mine)
  expect(pickBase({ version: 2, rev: 99 }, mine, t)).toBe(mine)
})

test('/cat export writes a backup and /cat import restores it after backing up the current save', { timeoutMs: 15_000 }, async ($, on) => {
  mock.clock(on, { now: t })
  mock.store(on)
  mock.env(on, { USERPROFILE: 'C:\\Users\\me' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  const files = new Map<string, string>()
  on('fs.write', ($, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  // The engine hands hooks absolute, native paths, so files are found by their name.
  const fileNamed = (name: string) => [...files].find(([path]) => path.split(/[\\/]/).at(-1) === name)?.[1]
  on('fs.read', ($, e) => {
    const text = fileNamed(e.path.split(/[\\/]/).at(-1) ?? '')
    if (text === undefined) throw new Error('missing')
    return { value: text }
  })
  const run = async (args: string) => (await $.command.run({
    command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })).text ?? ''
  await run('rename Biscuit')
  const saved = 'C:\\Users\\me\\.claude-kitten\\backups\\afk-cat-2026-10-02-1405.json'
  // The first /cat boots the household like session.start, so the day-one check-in has paid.
  expect(await run('export')).toContain(`Saved Biscuit and 20c to ${saved}`)
  expect(JSON.parse(fileNamed('afk-cat-2026-10-02-1405.json') ?? '{}').app).toBe('afk-cat')
  await run('rename Pudding')
  expect(await run('import')).toMatch(/Usage/)
  expect(await run('import nope.json')).toMatch(/Could not read/)
  files.set('bad.json', '{"app":"other"}')
  expect(await run('import bad.json')).toMatch(/not an afk-cat backup/)
  expect(await run(`import ${saved}`)).toMatch(/Imported 1 cats/)
  const before = JSON.parse(fileNamed('afk-cat-2026-10-02-1405-before-import.json') ?? '{}')
  expect(before.home.cats[0].name).toBe('Pudding')
  expect(await run('switch')).toMatch(/Cats: Biscuit\./)
})

test('a save another session wrote is picked up instead of overwritten', async ($, on) => {
  mock.clock(on, { now: t })
  mock.env(on, {})
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  // The store file both sessions share.
  const disk = new Map<string, unknown>()
  on('store.get', ($, e) => ({ value: disk.get(e.key) }))
  on('store.set', ($, e) => {
    disk.set(e.key, e.value)
    return { value: undefined }
  })
  const run = async (args: string) => (await $.command.run({
    command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })).text ?? ''
  await run('rename Mochi')
  const ours = disk.get('home') as { rev: number; cats: { name: string }[] }
  disk.set('home', { ...ours, rev: ours.rev + 3, cats: ours.cats.map(c => ({ ...c, name: 'Elsewhere' })) })
  expect(await run('switch')).toMatch(/Cats: Elsewhere\./)
  expect((disk.get('home') as { rev: number }).rev).toBe(ours.rev + 4)
})

test('auto backups rotate through one file per weekday and wait 30 minutes between writes', async () => {
  expect(autoBackupName(t)).toBe('afk-cat-auto-fri.json')
  expect(autoBackupName(t + 7 * 86_400_000)).toBe('afk-cat-auto-fri.json')
  expect(autoBackupName(t + 86_400_000)).toBe('afk-cat-auto-sat.json')
  expect(isAutoBackupDue(0, t)).toBe(true)
  expect(isAutoBackupDue(t, t + AUTO_BACKUP_MS - 1)).toBe(false)
  expect(isAutoBackupDue(t, t + AUTO_BACKUP_MS)).toBe(true)
  // A clock stepped backwards writes again instead of waiting out the gap.
  expect(isAutoBackupDue(t, t - 60_000)).toBe(true)
})

test('a damaged save is named, and a good or legacy one passes', async () => {
  const good = adopt({ ...newHome(t), coins: 50 }, t, seeded(1))
  expect(saveProblem(good, t)).toBe('')
  expect(saveProblem({ name: 'Mochi', level: 3 }, t, true)).toBe('')
  expect(saveProblem('{"version":3', t)).toBe('the save is not a household')
  expect(saveProblem([], t)).toBe('the save is not a household')
  expect(saveProblem({}, t)).toBe('the save has no known version')
  expect(saveProblem({ ...good, version: 9 }, t)).toBe('it was made by a newer afk-cat')
  expect(saveProblem({ ...good, cats: 'oops' }, t)).toBe('there are no cats in it')
  expect(saveProblem({ ...good, cats: [null] }, t)).toBe('a cat in it is damaged')
  expect(saveProblem({ ...good, coins: null }, t)).toBe('its coins are damaged')
  expect(saveProblem({ ...good, rev: 'x' }, t)).toBe('its revision is damaged')
  const { rev: _rev, ...early } = good
  expect(saveProblem(early, t)).toBe('')
})

test('recovery picks the newest backup that still loads and skips damaged copies', async () => {
  const at = (name: string, minutes: number) => ({ ...adopt({ ...newHome(t), coins: minutes }, t, seeded(2)), rev: minutes,
    cats: [{ ...newHome(t).cats[0]!, name }] })
  const file = (name: string, home: ReturnType<typeof at>, minutes: number) => ({ name, text: toBackup(home, t + minutes * 60_000) })
  const older = file('afk-cat-auto-thu.json', at('Older', 10), 10)
  const newest = file('afk-cat-auto-fri.json', at('Newest', 30), 30)
  const torn = { name: 'afk-cat-auto-sat.json', text: newest.text.slice(0, 200) }
  const damaged = file('afk-cat-2026-10-02-1500-damaged.json', at('Damaged', 90), 90)
  const stranger = file('notes.json', at('Stranger', 99), 99)
  expect(pickRecovery([older, torn, newest, damaged, stranger], t)?.name).toBe('afk-cat-auto-fri.json')
  expect(pickRecovery([older, torn], t)?.home.cats[0]?.name).toBe('Older')
  expect(pickRecovery([torn, damaged], t)).toBeUndefined()
  const odd = { name: 'afk-cat-odd.json', text: newest.text.replace(/"exportedAt": "[^"]*"/, '"exportedAt": {"toString": null}') }
  expect(pickRecovery([odd, older], t)?.name).toBe('afk-cat-auto-thu.json')
})

test('a damaged save with a newer revision never replaces the good one in memory', async () => {
  const mine = { ...newHome(t), rev: 5 }
  expect(pickBase({ version: 3, rev: 99, cats: 'oops', coins: 1 }, mine, t)).toBe(mine)
  expect(pickBase({ ...newHome(t), rev: 99, cats: [] }, mine, t)).toBe(mine)
})

// A household stored under a broken value, with backups on disk, booted by the first /cat.
const bootDamaged = async ($: Parameters<Parameters<typeof test>[1]>[0], on: Parameters<Parameters<typeof test>[1]>[1],
  stored: unknown, backups: Record<string, string>) => {
  mock.clock(on, { now: t })
  mock.env(on, { HOME: '/home/me' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  const toasts: string[] = []
  on('ui.toast', ($, e) => { toasts.push(e.text); return { value: undefined } })
  const disk = new Map<string, unknown>([['home', stored]])
  on('store.get', ($, e) => ({ value: disk.get(e.key) }))
  on('store.set', ($, e) => { disk.set(e.key, e.value); return { value: undefined } })
  const files = new Map<string, string>(Object.entries(backups))
  const nameOf = (path: string) => path.split(/[\\/]/).at(-1) ?? ''
  on('fs.write', ($, e) => { files.set(nameOf(e.path), e.text); return { value: undefined } })
  on('fs.read', ($, e) => {
    const text = files.get(nameOf(e.path))
    if (text === undefined) throw new Error('missing')
    return { value: text }
  })
  on('fs.list', () => ({ value: [...files.keys()].map(name => ({ name, kind: 'file', isLink: false })) }))
  const status = (await $.command.run({
    command: 'cat', args: 'status', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })).text ?? ''
  return { disk, files, toasts, status }
}

test('a corrupted save is restored from the newest good backup, and the damaged copy is kept', { timeoutMs: 15_000 }, async ($, on) => {
  const good = { ...adopt({ ...newHome(t), coins: 777 }, t, seeded(4)), rev: 40 }
  const named = { ...good, cats: good.cats.map((c, i) => ({ ...c, name: i ? 'Pudding' : 'Biscuit' })) }
  const old = { ...named, coins: 5, cats: named.cats.map(c => ({ ...c, name: 'Stale' })) }
  const corrupt = { version: 3, rev: 41, cats: 'garbage', coins: NaN }
  const { disk, files, toasts } = await bootDamaged($, on, corrupt, {
    'afk-cat-auto-wed.json': toBackup(old, t - 2 * 86_400_000),
    'afk-cat-auto-thu.json': toBackup(named, t - 86_400_000),
    'afk-cat-auto-fri.json': '{"app":"afk-cat","format":1,"home":{"cat',
  })
  const saved = disk.get('home') as { cats: { name: string }[]; coins: number }
  expect(saved.cats.map(c => c.name)).toEqual(['Biscuit', 'Pudding'])
  expect(saved.coins).toBeGreaterThan(100)
  expect(toasts.some(x => x.includes('Restored Biscuit, Pudding from afk-cat-auto-thu.json'))).toBe(true)
  const damaged = [...files].find(([name]) => name.endsWith('-damaged.json'))
  expect(damaged && JSON.parse(damaged[1]).cats).toBe('garbage')
  // The restored yard is backed up again, so today's torn file is replaced by a good one.
  expect(pickRecovery([{ name: 'afk-cat-auto-fri.json', text: files.get('afk-cat-auto-fri.json') ?? '' }], t)?.home.cats[0]?.name).toBe('Biscuit')
})

test('a corrupted save with no readable backup starts fresh but keeps the damaged copy', { timeoutMs: 15_000 }, async ($, on) => {
  const { disk, files, toasts } = await bootDamaged($, on, 'not a household', { 'afk-cat-auto-thu.json': 'nope' })
  expect(saveProblem(disk.get('home'), t)).toBe('')
  expect(toasts.some(x => x.includes('no backup could be read'))).toBe(true)
  expect([...files.values()].some(x => x.includes('not a household'))).toBe(true)
})

test('a missing save with a good backup on disk is restored, not started fresh', { timeoutMs: 15_000 }, async ($, on) => {
  // 2026-11-17: a crash zeroed the store file; once the host could read the store again it was simply empty.
  const good = { ...adopt({ ...newHome(t), coins: 900 }, t, seeded(5)), rev: 12 }
  const named = { ...good, cats: good.cats.map((c, i) => ({ ...c, name: i ? 'Mochi' : 'Tofu' })) }
  const { disk, toasts } = await bootDamaged($, on, undefined, { 'afk-cat-auto-fri.json': toBackup(named, t - 3_600_000) })
  const saved = disk.get('home') as { cats: { name: string }[]; coins: number }
  expect(saved.cats.map(c => c.name)).toEqual(['Tofu', 'Mochi'])
  expect(toasts.some(x => x.includes('Your save was missing. Restored Tofu, Mochi from afk-cat-auto-fri.json'))).toBe(true)
  // Saved above the backup's own revision, so an older session's next save can't overwrite the restore.
  expect((disk.get('home') as { rev: number }).rev).toBeGreaterThan(12)
})

test('a missing save with no backup starts fresh quietly', { timeoutMs: 15_000 }, async ($, on) => {
  const { disk, toasts } = await bootDamaged($, on, undefined, {})
  expect(saveProblem(disk.get('home'), t)).toBe('')
  expect(toasts.some(x => x.includes('missing') || x.includes('damaged'))).toBe(false)
})
