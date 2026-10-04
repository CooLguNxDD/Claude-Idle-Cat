import type { Home } from '../types'

// Command arguments support quoted names; preserve literal Windows path separators.
export const wordsOf = (args: string): string[] => {
  const words: string[] = []
  let word = '', quote = ''
  for (const ch of args.trim()) {
    if (quote) { if (ch === quote) quote = ''; else word += ch }
    else if ((ch === '"' || ch === "'") && !word) quote = ch
    else if (/\s/.test(ch)) { if (word) words.push(word); word = '' }
    else word += ch
  }
  if (word) words.push(word)
  return words
}
export const catRef = (home: Home, name: string): string => [...home.cats, ...home.visitors].find(c => c.id === name || c.name.toLowerCase() === name.toLowerCase())?.id ?? name
