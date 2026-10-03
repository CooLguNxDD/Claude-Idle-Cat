import { expect, test } from 'claude-code/testing'
import { newHome } from './game'
import { pickReaction, rememberReaction } from './reactions'
import { isTestCommand, signalsOf, turnSignal } from './reactions/signals'
import { seeded } from './rng'

test('test command recognition covers runners and compound shell commands', () => {
  for (const command of ['npm test', 'pnpm run test:unit', 'yarn test', 'bun test', 'npx vitest run', 'pytest -q', 'cargo test', 'go test ./...', 'node --test server/arcade.test.mjs', 'claude plugin test .', 'cd project && npm test']) expect(isTestCommand(command)).toBe(true)
  for (const command of ['git status', 'npm install', 'sleep 30', 'echo "test"', 'echo npm test', 'printf pytest', 'contest file']) expect(isTestCommand(command)).toBe(false)
})
test('signals preserve test precedence, timing and turn completion reasons', () => {
  expect(signalsOf({ tool: 'Bash', command: 'npm test', isError: true, ms: 10 })).toEqual(['test.fail', 'tool.error'])
  expect(signalsOf({ tool: 'Bash', command: 'npm test', isError: false, ms: 10 })).toEqual(['test.pass', 'tool.ok'])
  expect(signalsOf({ tool: 'Bash', isError: false, ms: 20000, isLong: true })).toEqual(['tool.long'])
  expect(turnSignal('answer')).toBe('turn.done'); expect(turnSignal('error')).toBe('turn.error')
})
test('reactions obey per-cat cooldown, tool filters, mode and seeded odds without touching stats', () => {
  const cat = newHome(0).cats[0]!, rng = seeded(17)
  const reaction = pickReaction(cat, ['test.pass'], 'Bash', 0, {}, rng)!
  expect(reaction.id).toBe('celebrate-tests')
  const memory = rememberReaction({}, cat.id, reaction.id, 0)
  expect(pickReaction(cat, ['test.pass'], 'Bash', 14999, memory, rng)).toBeNull()
  expect(pickReaction(cat, ['test.pass'], 'Bash', 15000, memory, rng)?.id).toBe(reaction.id)
  expect(pickReaction(cat, ['test.pass'], 'Bash', 0, {}, rng, 'off')).toBeNull()
  expect(pickReaction(cat, ['test.pass'], 'Bash', 0, {}, rng, 'quiet')?.id).toBe(reaction.id)
  expect(pickReaction(cat, ['tool.long'], 'Read', 0, {}, rng)).toBeNull()
  const sample = (seed: number) => { const r = seeded(seed); return Array.from({ length: 100 }, () => !!pickReaction(cat, ['tool.error'], 'Bash', 0, {}, r)) }
  expect(sample(10)).toEqual(sample(10)); expect(sample(10).filter(Boolean).length).toBeGreaterThan(40)
  expect(sample(10).filter(Boolean).length).toBeLessThan(90)
})
