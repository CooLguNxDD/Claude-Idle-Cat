// Deterministic, dependency-free pixel backgrounds for every Catppuccin flavor.
import { deflateSync } from 'node:zlib'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const W = 112
const H = 64
const OUT_W = 320
const OUT_H = 180
const names = ['rosewater', 'flamingo', 'pink', 'mauve', 'red', 'maroon', 'peach', 'yellow', 'green', 'teal',
  'sky', 'sapphire', 'blue', 'lavender', 'text', 'subtext1', 'subtext0', 'overlay2', 'overlay1', 'overlay0',
  'surface2', 'surface1', 'surface0', 'base', 'mantle', 'crust']
const source = readFileSync(join('hooks', 'theme.ts'), 'utf8')
const flavors = Object.fromEntries([...source.matchAll(/^\s*(latte|frappe|macchiato|mocha): '([a-f0-9 ]+)'/gm)]
  .map(([, name, colors]) => [name, Object.fromEntries(colors.split(' ').map((hex, i) => [names[i], parseInt(hex, 16)]))]))
if (Object.keys(flavors).length !== 4) throw new Error('Could not read all theme palettes')

const pngChunk = (type, data) => {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length)
  head.write(type, 4, 'ascii')
  let crc = 0xffffffff
  for (const byte of Buffer.concat([Buffer.from(type), data])) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([head, data, tail])
}
const png = pixels => {
  const raw = Buffer.alloc(OUT_H * (OUT_W * 3 + 1))
  for (let y = 0; y < OUT_H; y++) pixels.copy(raw, y * (OUT_W * 3 + 1) + 1, y * OUT_W * 3, (y + 1) * OUT_W * 3)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(OUT_W, 0)
  ihdr.writeUInt32BE(OUT_H, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))])
}

const scene = (id, p, flavor) => {
  const pixels = Buffer.alloc(OUT_W * OUT_H * 3)
  const color = name => p[name] ?? p.base
  const putFine = (x, y, c) => {
    if (x < 0 || y < 0 || x >= OUT_W || y >= OUT_H) return
    const i = (y * OUT_W + x) * 3
    const v = typeof c === 'string' ? color(c) : c
    pixels[i] = v >> 16 & 255; pixels[i + 1] = v >> 8 & 255; pixels[i + 2] = v & 255
  }
  const put = (x, y, c) => {
    x = Math.floor(x); y = Math.floor(y)
    if (x < 0 || y < 0 || x >= W || y >= H) return
    for (let py = Math.floor(y * OUT_H / H); py < Math.floor((y + 1) * OUT_H / H); py++)
      for (let px = Math.floor(x * OUT_W / W); px < Math.floor((x + 1) * OUT_W / W); px++) putFine(px, py, c)
  }
  const rect = (x, y, w, h, c) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c)
  }
  const noise = (x, y, salt = 0) => ((x * 1103515245 + y * 12345 + salt * 65537) >>> 0) % 101
  const shade = (a, b, t) => {
    const x = color(a), z = color(b)
    const channel = s => Math.round(((x >> s) & 255) * (1 - t) + ((z >> s) & 255) * t) << s
    return channel(16) | channel(8) | channel(0)
  }
  const gradient = (from, to, top, bottom, bands = 12) => {
    for (let y = from; y < to; y++) {
      const t = Math.floor(((y - from) / Math.max(1, to - from - 1)) * bands) / bands
      rect(0, y, W, 1, shade(top, bottom, t))
    }
  }
  rect(0, 0, W, H, 'base')
  if (id === 'dash') {
    gradient(0, 48, flavor === 'latte' ? 'sky' : 'surface0', 'sapphire', 16)
    if (flavor === 'latte') {
      rect(85, 8, 8, 8, 'yellow'); rect(83, 10, 12, 4, 'yellow')
    } else {
      rect(85, 8, 7, 7, 'rosewater'); rect(88, 6, 7, 8, shade('surface0', 'sapphire', 0.25))
      for (let i = 0; i < 15; i++) if (noise(i, 4) < 70) put((i * 19) % W, 2 + (i * 11) % 21, 'rosewater')
    }
    for (let x = 6; x < 78; x += 31) {
      rect(x, 14, 13, 2, 'rosewater'); rect(x + 3, 12, 7, 2, 'rosewater')
    }
    for (let x = 0; x < W; x += 9) {
      const roof = 23 + noise(x, 1) % 12
      rect(x, roof, 8, 21, 'surface1'); rect(x, roof, 8, 1, 'overlay0')
      for (let wy = roof + 4; wy < 43; wy += 5) for (let wx = x + 2; wx < x + 7; wx += 3)
        rect(wx, wy, 1, 2, noise(wx, wy) % 3 ? 'yellow' : 'surface2')
    }
    rect(0, 54, W, 10, 'surface2'); rect(0, 54, W, 2, 'overlay0')
    for (let x = 0; x < W; x += 7) rect(x, 59, 3, 1, 'surface1')
  } else if (id === 'catch') {
    gradient(0, 55, 'sky', 'surface0', 12)
    for (let x = 8; x < W; x += 24) {
      rect(x, 27, 11, 1, 'rosewater'); rect(x + 3, 25, 6, 2, 'rosewater')
    }
    rect(4, 5, 104, 2, 'peach'); rect(4, 7, 104, 1, 'maroon')
    for (let x = 4; x < 108; x += 10) {
      rect(x, 8, 10, 4, (x / 10) % 2 < 1 ? 'rosewater' : 'red')
      rect(x + 1, 12, 8, 1, 'maroon')
    }
    rect(0, 55, W, 9, 'surface2'); rect(0, 55, W, 2, 'peach')
    for (let x = 3; x < W; x += 12) rect(x, 58, 1, 6, 'surface1')
  } else if (id === 'laser') {
    rect(0, 0, W, H, 'surface0')
    for (let y = 0; y < H; y += 8) {
      rect(0, y, W, 1, 'mantle')
      for (let x = (y / 8) % 2 ? 0 : 16; x < W; x += 32) rect(x, y + 1, 1, 7, 'surface1')
    }
    rect(25, 17, 62, 34, 'maroon'); rect(27, 19, 58, 30, 'mauve')
    rect(29, 21, 54, 26, 'surface1')
    for (let x = 32; x < 81; x += 6) {
      rect(x, 22, 2, 2, 'lavender'); rect(x, 45, 2, 2, 'lavender')
    }
    for (let y = 23; y < 46; y += 5) { rect(30, y, 2, 2, 'lavender'); rect(80, y, 2, 2, 'lavender') }
  } else if (id === 'whack') {
    rect(0, 0, W, H, shade('green', 'surface0', 0.55))
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3)
      if (noise(x, y, 5) < 32) rect(x, y, 1, 2, 'teal')
    rect(3, 2, 106, 60, 'surface1'); rect(5, 4, 102, 56, shade('green', 'surface0', 0.55))
    for (let y = 5; y < 60; y += 20) for (let x = 5; x < 107; x += 34) {
      rect(x, y, 1, 18, shade('surface1', 'green', 0.3))
      rect(x, y, 32, 1, shade('surface1', 'green', 0.3))
    }
  } else if (id === 'tank') {
    gradient(0, 57, 'sky', 'teal', 16)
    rect(0, 8, W, 2, 'rosewater'); rect(0, 9, W, 1, 'overlay0')
    for (let x = 3; x < W; x += 11) {
      const len = 4 + noise(x, 3) % 8
      rect(x, 53 - len, 2, len, 'green'); rect(x + 2, 49 - len, 1, 5, 'teal')
    }
    for (let x = 8; x < W; x += 16) for (let y = 18; y < 48; y += 15)
      if (noise(x, y, 8) % 2) { put(x, y, 'rosewater'); put(x + 1, y - 2, 'sky') }
    rect(0, 57, W, 7, 'peach')
    for (let x = 2; x < W; x += 8) if (noise(x, 57, 3) < 55) rect(x, 59, 3, 1, 'yellow')
  } else if (id === 'lanes') {
    rect(0, 0, W, 16, 'sky')
    for (let x = 0; x < W; x += 8) { rect(x, 8, 1, 12, 'peach'); rect(x, 13, 8, 2, 'surface1') }
    rect(0, 16, W, 48, 'green')
    for (let row = 0; row < 3; row++) {
      const y = 16 + row * 16
      rect(0, y, W, 1, 'teal')
      for (let x = 0; x < W; x += 14) if ((x / 14 + row) % 2 === 0) rect(x, y + 1, 14, 15, 'teal')
    }
    rect(0, 0, W, 16, 'surface1'); rect(0, 15, W, 1, 'peach')
  }
  // Fine one-pixel accents give the HD source texture without changing game geometry.
  for (let i = 0; i < 70; i++) {
    const x = (i * 97 + 13) % OUT_W
    const y = (i * 53 + 7) % OUT_H
    if (id === 'dash' && y < 70 && noise(x, y, 9) < 55) putFine(x, y, 'rosewater')
    if (id === 'catch' && y > 38 && y < 147 && noise(x, y, 7) < 42) putFine(x, y, 'yellow')
    if (id === 'laser' && y < 160 && noise(x, y, 4) < 35) putFine(x, y, 'lavender')
    if (id === 'whack' && y > 14 && noise(x, y, 5) < 28) putFine(x, y, 'yellow')
    if (id === 'tank' && y > 22 && y < 150 && noise(x, y, 6) < 55) putFine(x, y, 'rosewater')
    if (id === 'lanes' && y > 49 && noise(x, y, 8) < 25) putFine(x, y, 'yellow')
  }
  return pixels
}

const out = join('server', 'public', 'art')
mkdirSync(out, { recursive: true })
for (const [flavor, palette] of Object.entries(flavors)) {
  for (const id of ['dash', 'catch', 'laser', 'whack', 'tank', 'lanes']) {
    writeFileSync(join(out, `${id}.${flavor}.png`), png(scene(id, palette, flavor)))
  }
}
console.log('wrote 24 arcade backgrounds')
