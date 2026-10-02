import { expect, mock, test } from 'claude-code/testing'

import { newHome } from './game'
import { SPINNER_WORDS, catHint, doneWord, hintTail, pawPrefix, skinLevel, spinnerWord, walkFrame } from './skin'
import type { SpinnerMode } from './skin'

test('spinner words are stable per engine word and come from the mode list', () => {
  for (const mode of Object.keys(SPINNER_WORDS) as SpinnerMode[]) {
    const word = spinnerWord(mode, 'Sauteing')
    expect(SPINNER_WORDS[mode]).toContain(word)
    expect(spinnerWord(mode, 'Sauteing')).toBe(word)
  }
  expect(doneWord('Baked')).toBe(doneWord('Baked'))
})

test('the hint pill is reworded and keeps the key binding', () => {
  expect(catHint('(ctrl+g to run in background)')).toBe('(ctrl+g to let the cat wander off)')
  expect(catHint('esc to interrupt')).toBe('esc to interrupt')
})

test('the walking band is exactly as wide as asked and wraps', () => {
  for (const tick of [0, 1, 7, 30, 31, 500]) expect(walkFrame(tick, 30)).toHaveLength(30)
  expect(walkFrame(0, 30).startsWith('=^.^=')).toBe(true)
  expect(walkFrame(25, 30)).toBe(walkFrame(25 + 25, 30))
  expect(walkFrame(3, 2)).toHaveLength(2)
})

test('the hint tail names the active cat and tool rows get paws', () => {
  const home = newHome(1_700_000_000_000)
  expect(hintTail(home)).toMatch(/^🐱 .+ · \w+ · \d+c$/)
  expect(hintTail(undefined)).toBe('')
  expect(pawPrefix('Bash')).toBe('🐭')
  expect(pawPrefix('Whatever')).toBe('🐾')
  expect(skinLevel('light')).toBe('light')
  expect(skinLevel('nonsense')).toBe('full')
})

type Dollar = Parameters<Extract<Parameters<typeof test>[1], (...a: never[]) => unknown>>[0]
const mountSkin = async ($: Dollar, component: string, props: Record<string, unknown>) =>
  $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component, props } as never)

test('the engine components are redrawn with cat words, a tail and a walking band', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  // Stands in for the engine's own drawing, which a test has no copy of.
  on('ui.render', (_$, e) => ({ type: 'Text', children: [String((e.props as { word?: string; tail?: string }).word ?? (e.props as { tail?: string }).tail ?? 'engine')] }))
  await $.command.run({ command: 'cat', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  const spinner = await mountSkin($, 'Spinner', { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' })
  expect(await spinner.find({ type: 'Text', text: new RegExp(SPINNER_WORDS.thinking.join('|')) })).toBeDefined()
  const hint = await mountSkin($, 'PromptHint', { isDraft: false, isWorking: false, hint: '? for shortcuts' })
  expect(await hint.find({ type: 'Text', text: /🐱/ })).toBeDefined()
  const base = { hasSurvey: false, maxRows: 5, bodyColumns: 40, scroll: { offset: 0, bodyRows: 5 }, view: {} }
  const band = await mountSkin($, 'AbovePrompt', { ...base, isWorking: true })
  expect(await band.find({ type: 'Text', text: /=\^\.\^=/ })).toBeDefined()
  const idle = await mountSkin($, 'AbovePrompt', { ...base, isWorking: false })
  expect(await idle.find({ type: 'Text', text: /=\^\.\^=/ })).toBeUndefined()
  const survey = await mountSkin($, 'AbovePrompt', { ...base, isWorking: true, hasSurvey: true })
  expect(await survey.find({ type: 'Text', text: /=\^\.\^=/ })).toBeUndefined()
})

test('/cat theme sets the Catppuccin theme Claude Code lists, or says how to get it', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  let options = ['dark', 'light']
  const set: unknown[] = []
  on('config.list', () => ({ value: [{ key: 'theme', options, value: 'dark' }] as never }))
  on('config.set', (_$, e) => { set.push(e.value); return { value: e.value } as never })
  const run = (args: string) => $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  expect((await run('theme')).text).toMatch(/Usage/)
  expect((await run('theme mocha')).text).toMatch(/doesn't list/)
  options = ['dark', 'custom:catppuccin-mocha']
  expect((await run('theme mocha')).text).toMatch(/Theme set to custom:catppuccin-mocha/)
  expect(set).toEqual(['custom:catppuccin-mocha'])
})
