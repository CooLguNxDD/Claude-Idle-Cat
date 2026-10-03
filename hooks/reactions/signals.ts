import type { Signal } from '../content/types'

// Match test runners at command boundaries, including package-manager test scripts.
export const isTestCommand = (command: string): boolean => command.split(/&&|\|\||;/).some(part => {
  const c = part.trim().replace(/^(?:[A-Z_][A-Z0-9_]*=\S+\s+)+/, '').replace(/^npx\s+(?:-y\s+)?/, '')
  return /^(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?:[\s:]|$)|(?:vitest|jest|pytest)(?:\s|$)|(?:cargo|go)\s+test(?:\s|$)|node\s+--test(?:\s|$)|claude\s+plugin\s+test(?:\s|$))/i.test(c)
})
export type ToolSignal = { tool: string; command?: string; isError: boolean; ms: number; isLong?: boolean }
export const signalsOf = (e: ToolSignal): Signal[] => e.isLong ? ['tool.long'] : [
  ...(isTestCommand(e.command ?? '') ? [e.isError ? 'test.fail' as const : 'test.pass' as const] : []),
  e.isError ? 'tool.error' : 'tool.ok',
]
export const turnSignal = (reason: string): Signal => ['error', 'api-error', 'aborted', 'refusal'].includes(reason) ? 'turn.error' : 'turn.done'
