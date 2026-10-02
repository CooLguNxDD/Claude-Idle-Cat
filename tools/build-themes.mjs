// Writes Claude Code custom themes (themes/catppuccin-<flavor>.json) from hooks/theme.ts: node tools/build-themes.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FLAVORS, claudeThemeOf } from '../hooks/theme.ts'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'themes')
mkdirSync(dir, { recursive: true })
for (const flavor of Object.values(FLAVORS)) {
  writeFileSync(join(dir, `catppuccin-${flavor.name}.json`), `${JSON.stringify(claudeThemeOf(flavor), null, 2)}\n`)
  console.log(`wrote themes/catppuccin-${flavor.name}.json`)
}
