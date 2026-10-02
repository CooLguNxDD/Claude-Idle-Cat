// Bundles the browser arcade (web/ plus the pure games) into server/public/arcade.js: node tools/build-web.mjs
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
execSync('npx -y esbuild@0.25 web/arcade.ts --bundle --format=iife --minify --target=es2020 --legal-comments=none '
  + '--tsconfig=web/tsconfig.json --outfile=server/public/arcade.js', { cwd: root, stdio: 'inherit' })
console.log('wrote server/public/arcade.js')
