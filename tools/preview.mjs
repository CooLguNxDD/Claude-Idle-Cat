// Renders a content preview PNG to look at before committing: node tools/preview.mjs breed <id> [--out <dir>]
// A breed sheet is one row per flavor, with the 4x portrait in every marking and silhouette.
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [kind, id] = process.argv.slice(2)
const outAt = process.argv.indexOf('--out')
const out = resolve(outAt > 0 ? process.argv[outAt + 1] : join(tmpdir(), 'idle-cat-previews'))
if (kind !== 'breed' || !id) {
  console.error('usage: node tools/preview.mjs breed <id> [--out <dir>]')
  process.exit(1)
}

// The mod's modules are extensionless TypeScript, so bundle a tiny entry with esbuild and import that.
const entry = `
import { COATS, MARKINGS, SILHOUETTES } from './hooks/adoption/registry'
import { canvas } from './hooks/scene/canvas'
import { pen } from './hooks/scene/fine/draw'
import { drawHiCat } from './hooks/scene/hicat'
import { FLAVORS, FLAVOR_NAMES } from './hooks/theme'
export const coats = COATS
export const sheet = (coat) => FLAVOR_NAMES.map(name => MARKINGS.flatMap(marking => SILHOUETTES.map(silhouette => {
  const c = canvas(24, 4)
  const f = FLAVORS[name]
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) c.put(x, y, f.base)
  drawHiCat(pen(c), 16, 24, { genes: { coat, eyes: 'green', personality: 'lazy', isShiny: false, marking, silhouette },
    mood: 'happy', form: null, isAdult: true, isBirthday: false, isBlink: false, tick: 0 }, f)
  return c.image(f.base)
})))
`
const dir = mkdtempSync(join(tmpdir(), 'idle-cat-preview-'))
const bundle = join(dir, 'preview.mjs')
execSync(`npx -y esbuild@0.25 --bundle --format=esm --platform=node --loader=ts --outfile=${JSON.stringify(bundle)}`,
  { cwd: root, input: entry, stdio: ['pipe', 'ignore', 'pipe'] })
const { coats, sheet } = await import(pathToFileURL(bundle).href)
if (!coats.includes(id)) {
  console.error(`no breed ${id}; known: ${coats.join(', ')}`)
  process.exit(1)
}

const rows = sheet(id)
const tile = rows[0][0]
const width = tile.width * rows[0].length
const height = tile.height * rows.length
const rgba = Buffer.alloc(width * height * 4)
rows.forEach((row, r) => row.forEach((img, i) => {
  const px = Buffer.from(img.rgba, 'base64')
  for (let y = 0; y < img.height; y++)
    px.copy(rgba, ((r * img.height + y) * width + i * img.width) * 4, y * img.width * 4, (y + 1) * img.width * 4)
}))

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = buf => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length)
  head.write(type, 4)
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])))
  return Buffer.concat([head, data, tail])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(width)
ihdr.writeUInt32BE(height, 4)
ihdr.set([8, 6, 0, 0, 0], 8)
const raw = Buffer.alloc((width * 4 + 1) * height)
for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0))])
mkdirSync(out, { recursive: true })
const file = join(out, `breed-${id}.png`)
writeFileSync(file, png)
console.log(`wrote ${file} (rows: latte, frappe, macchiato, mocha; columns: markings x silhouettes)`)
