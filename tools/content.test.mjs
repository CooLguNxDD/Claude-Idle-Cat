import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
test('Claude and Codex generator skills are byte-for-byte mirrors', () => {
  const files = dir => readdirSync(dir, { recursive: true, withFileTypes: true }).filter(f => f.isFile()).map(f => join(f.parentPath, f.name).slice(dir.length + 1)).sort()
  const a = join(root, '.claude', 'skills'), b = join(root, '.agents', 'skills')
  const skillDirs = dir => readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory())
  assert.equal(skillDirs(a).length, 17)
  assert.equal(skillDirs(b).length, 17)
  assert.deepEqual(files(a), files(b))
  for (const f of files(a)) assert.equal(readFileSync(join(a, f), 'utf8'), readFileSync(join(b, f), 'utf8'), f)
})
test('content builder preserves seeded order, appends new ids and detects staleness', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'cat-content-test-'))
  try {
    mkdirSync(join(scratch, 'tools')); mkdirSync(join(scratch, 'hooks', 'content', 'furniture'), { recursive: true })
    cpSync(join(root, 'tools', 'build-content.mjs'), join(scratch, 'tools', 'build-content.mjs'))
    const content = join(scratch, 'hooks', 'content'), source = id => `import { defineFurniture } from '../types'\nexport default defineFurniture({ id: '${id}' })\n`
    for (const id of ['zebra', 'apple']) writeFileSync(join(content, 'furniture', `${id}.ts`), source(id))
    writeFileSync(join(content, 'index.ts'), "import zebra from './furniture/zebra'\nimport apple from './furniture/apple'\n")
    const run = args => execFileSync(process.execPath, [join(scratch, 'tools', 'build-content.mjs'), ...args], { stdio: 'pipe' })
    run([]); run(['--check'])
    writeFileSync(join(content, 'breed-registry.ts'), '// stale\n')
    assert.throws(() => run(['--check']))
    run([]); run(['--check'])
    writeFileSync(join(content, 'furniture', 'banana.ts'), source('banana'))
    assert.throws(() => run(['--check']))
    run([])
    const ids = [...readFileSync(join(content, 'index.ts'), 'utf8').matchAll(/from '\.\/furniture\/([^']+)'/g)].map(m => m[1])
    assert.deepEqual(ids, ['zebra', 'apple', 'banana'])
    writeFileSync(join(content, 'furniture', 'wrong.ts'), source('other'))
    assert.throws(() => run([]))
  } finally { rmSync(scratch, { recursive: true, force: true }) }
})

test('the committed arcade bundle stays isolated from progression content', () => {
  const bundle = readFileSync(join(root, 'server', 'public', 'arcade.js'), 'utf8')
  for (const id of ['harbor-map', 'pumpkin-patch', 'gift-exchange', 'hiss-at-error', 'Moon hammock'])
    assert.equal(bundle.includes(id), false, id)
  assert.ok(Buffer.byteLength(bundle) < 55300, 'arcade exceeds its pre-v2 bundle size; inspect browser dependencies')
  assert.ok(bundle.includes('Rooftop'), 'expected arcade code is present')
})
