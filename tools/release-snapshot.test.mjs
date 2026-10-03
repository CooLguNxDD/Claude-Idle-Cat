import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  assertSameVersion,
  assertTag,
  expectedTag,
  groupContributions,
  renderNotes,
} from './release-snapshot.mjs'

test('release tags use the Claude plugin form', () => {
  assert.equal(expectedTag('afk-cat', '0.3.0'), 'afk-cat--v0.3.0')
  assert.throws(() => assertTag('v0.3.0', 'afk-cat', '0.3.0'), /afk-cat--v0\.3\.0/)
  assert.doesNotThrow(() => assertTag('afk-cat--v0.3.0', 'afk-cat', '0.3.0'))
})

test('plugin.json and the marketplace entry must share a version', () => {
  assert.throws(() => assertSameVersion('0.3.0', undefined, 'afk-cat'), /no version/)
  assert.throws(() => assertSameVersion('0.3.0', '0.2.0', 'afk-cat'), /Version mismatch/)
  assert.doesNotThrow(() => assertSameVersion('0.3.0', '0.3.0', 'afk-cat'))
})

test('contributions group by conventional commit type', () => {
  const groups = groupContributions([
    { subject: 'feat(arcade): add a tank' },
    { subject: 'fix(saves): keep the newer rev' },
    { subject: 'docs(readme): describe weather' },
    { subject: 'chore(git): ignore local settings' },
  ])
  assert.equal(groups.Features.length, 1)
  assert.equal(groups.Fixes.length, 1)
  assert.equal(groups.Documentation.length, 1)
  assert.equal(groups.Other.length, 1)
})

test('release notes carry the snapshot, install lines, and contributions', () => {
  const notes = renderNotes({
    title: 'afk-cat v0.3.0',
    preview: false,
    plugin: {
      name: 'afk-cat',
      displayName: 'Claude Idle Cat',
      version: '0.3.0',
      description: 'An AFK cat.',
      author: 'Andrew Liang',
      license: 'MIT',
      marketplace: 'claude-idle-cat',
      claudeCode: '2.1.287',
    },
    repository: 'CooLguNxDD/Claude-Idle-Cat',
    git: { tag: 'afk-cat--v0.3.0', commit: 'abc1234abc1234abc1234abc1234abc1234abc12', committedAt: '2026-10-03T00:00:00Z' },
    previousTag: null,
    compareUrl: null,
    historyUrl: 'https://github.com/CooLguNxDD/Claude-Idle-Cat/commits/afk-cat--v0.3.0',
    archive: {
      file: 'afk-cat-0.3.0.zip',
      bytes: 10,
      sha256: 'deadbeef',
      url: 'https://github.com/CooLguNxDD/Claude-Idle-Cat/releases/download/afk-cat--v0.3.0/afk-cat-0.3.0.zip',
    },
    inventory: { breeds: 28, moves: 14, worlds: 6, namedCats: 6, games: 6, themes: 4, sounds: 5, arcadeBundle: true },
    options: [{ key: 'flavor', title: 'Catppuccin flavor' }],
    contributions: [{ short: 'c15d584', subject: 'feat(content): add themed worlds', author: 'Andrew Liang' }],
    contributors: ['Andrew Liang'],
  })
  assert.match(notes, /## Release snapshot/)
  assert.match(notes, /## Contributions/)
  assert.match(notes, /## Install/)
  assert.match(notes, /afk-cat--v0\.3\.0/)
  assert.match(notes, /deadbeef/)
  assert.match(notes, /claude --plugin-url/)
  assert.match(notes, /Andrew Liang/)
})

test('preview writes a snapshot zip from this checkout', () => {
  const out = mkdtempSync(join(tmpdir(), 'afk-release-'))
  const script = fileURLToPath(new URL('./release-snapshot.mjs', import.meta.url))
  const run = spawnSync(process.execPath, [script, '--preview', '--out', out], { encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr || run.stdout)
  try {
    const snapshot = JSON.parse(readFileSync(join(out, 'release-snapshot.json'), 'utf8'))
    assert.equal(snapshot.kind, 'claude-plugin-release')
    assert.equal(snapshot.preview, true)
    assert.equal(snapshot.plugin.name, 'afk-cat')
    assert.equal(snapshot.plugin.version, '0.3.0')
    assert.equal(snapshot.plugin.marketplace, 'claude-idle-cat')
    assert.equal(snapshot.git.tag, 'afk-cat--v0.3.0')
    assert.equal(snapshot.archive.sha256.length, 64)
    assert.ok(snapshot.inventory.breeds > 0)
    assert.ok(snapshot.inventory.arcadeBundle)
    assert.ok(snapshot.contributions.length > 0)
    assert.match(readFileSync(join(out, 'RELEASE.md'), 'utf8'), /Release snapshot/)
    const sum = readFileSync(join(out, 'afk-cat-0.3.0.zip.sha256'), 'utf8')
    assert.match(sum, new RegExp(`^${snapshot.archive.sha256}  afk-cat-0\\.3\\.0\\.zip\\n$`))
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
})
