import { expect, test } from 'claude-code/testing'

import { newHome } from '../game'
import { seeded } from '../rng'
import { arcadeUrl, browserArgv, newToken, parseLine, snapshotOf, splitLines } from './bridge'
import { startGame } from './rewards'

test('stdout pieces become whole lines, the unfinished tail kept for later', async () => {
  const a = splitLines('', '{"kind":"ready","port":1}\n{"kind":"st')
  expect(a.lines).toEqual(['{"kind":"ready","port":1}'])
  const b = splitLines(a.rest, 'art","game":"dash"}\n')
  expect(b.lines).toEqual(['{"kind":"start","game":"dash"}'])
  expect(b.rest).toBe('')
})

test('only well-formed server lines are read', async () => {
  expect(parseLine('{"kind":"ready","port":4242}')).toEqual({ kind: 'ready', port: 4242 })
  expect(parseLine('{"kind":"start","game":"tank"}')).toEqual({ kind: 'start', game: 'tank' })
  expect(parseLine('{"kind":"start","game":"chess"}')).toBeNull()
  expect(parseLine('{"kind":"ready","port":-1}')).toBeNull()
  expect(parseLine('Debugger listening…')).toBeNull()
  expect(parseLine('{"kind":"result","game":"dash","score":5,"ms":100}')).toEqual({ kind: 'result', game: 'dash', score: 5, ms: 100 })
})

test('the snapshot carries the menu and the open round, and the token is 128-bit hex', async () => {
  const t = new Date(2026, 0, 5, 12).getTime()
  const idle = snapshotOf(newHome(t), t, 'latte')
  expect(idle.round).toBeNull()
  expect(idle.menu.games.map(g => g.id)).toEqual(['dash', 'catch', 'laser', 'whack', 'tank', 'lanes'])
  expect(idle.menu.flavor).toBe('latte')
  const playing = snapshotOf(startGame(newHome(t), 'lanes', t), t, 'mocha')
  expect(playing.round?.game).toBe('lanes')
  expect(playing.round?.id).toBe(t)
  expect(newToken(seeded(1))).toMatch(/^[0-9a-f]{32}$/)
  expect(arcadeUrl(80, 'abc')).toBe('http://localhost:80/?t=abc')
  expect(browserArgv(true, 'u')).toEqual([['rundll32', 'url.dll,FileProtocolHandler', 'u']])
})
