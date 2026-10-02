import { expect, mock, test } from 'claude-code/testing'

import { backupDir, backupName, parseBackup, pickBase, toBackup } from './backup'
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

test('/cat export writes a backup and /cat import restores it after backing up the current save', async ($, on) => {
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
  expect(await run('export')).toContain(`Saved Biscuit and 10c to ${saved}`)
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
