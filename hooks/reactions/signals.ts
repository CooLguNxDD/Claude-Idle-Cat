import type { Signal } from '../content/types'

// Split shell command boundaries while keeping quoted text inside its original command.
const commandsOf = (command: string): string[] => {
  const parts: string[] = []
  let start = 0, quote = ''
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]!
    if (ch === '\\' && quote !== "'") { i++; continue }
    if (quote) { if (ch === quote) quote = ''; continue }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === ';' || ch === '\n' || ch === '|' || (ch === '&' && command[i + 1] === '&')) {
      parts.push(command.slice(start, i))
      if (ch === '&' || (ch === '|' && command[i + 1] === '|')) i++
      start = i + 1
    }
  }
  parts.push(command.slice(start))
  return parts
}
// Recognize common test runners; this is a cosmetic heuristic, not a shell interpreter.
export const isTestCommand = (command: string): boolean => commandsOf(command).some(part => {
  const c = part.trim().replace(/^(?:[A-Z_][A-Z0-9_]*=\S+\s+)+/, '').replace(/^npx\s+(?:-y\s+)?/, '')
  return /^(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?:[\s:]|$)|(?:vitest|jest|pytest)(?:\s|$)|(?:cargo|go|make|deno|dotnet)\s+test(?:\s|$)|python(?:3)?\s+-m\s+pytest(?:\s|$)|node\s+--test(?:\s|$)|claude\s+plugin\s+test(?:\s|$))/i.test(c)
})
export type ToolSignal = { tool: string; command?: string; isError: boolean; ms: number; isLong?: boolean }
// Map a completed tool outcome to test-first signals, or an explicit mid-call long signal.
export const signalsOf = (e: ToolSignal): Signal[] => e.isLong ? ['tool.long'] : [
  ...(isTestCommand(e.command ?? '') ? [e.isError ? 'test.fail' as const : 'test.pass' as const] : []),
  e.isError ? 'tool.error' : 'tool.ok',
]
// Map Claude's completion reason to a cosmetic turn signal.
export const turnSignal = (reason: string): Signal => ['error', 'api-error', 'aborted', 'refusal'].includes(reason) ? 'turn.error' : 'turn.done'
