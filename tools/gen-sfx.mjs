// Generates the mod's original chiptune clips: node tools/gen-sfx.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 22050
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx')

// notes: [frequency Hz, seconds, wave]; a soft attack/decay keeps clicks out.
const render = (notes, volume = 0.22) => {
  const samples = []
  for (const [freq, secs, wave = 'square', slideTo] of notes) {
    const n = Math.floor(secs * RATE)
    let phase = 0
    for (let i = 0; i < n; i++) {
      const f = slideTo ? freq + (slideTo - freq) * (i / n) : freq
      phase += f / RATE
      const p = phase % 1
      const raw = freq === 0 ? 0 : wave === 'triangle' ? 4 * Math.abs(p - 0.5) - 1 : p < 0.5 ? 1 : -1
      const env = Math.min(1, i / (0.005 * RATE)) * Math.min(1, (n - i) / (0.04 * RATE))
      samples.push(raw * env * volume)
    }
  }
  return samples
}

const wav = samples => {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2))
  const head = Buffer.alloc(44)
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8)
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22)
  head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34)
  head.write('data', 36); head.writeUInt32LE(data.length, 40)
  return Buffer.concat([head, data])
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, A5 = 880, D6 = 1174.66, E6 = 1318.5
const CLIPS = {
  levelup: [[C5, 0.07], [E5, 0.07], [G5, 0.07], [C6, 0.18]],
  evolve: [[300, 0.35, 'triangle', 900], [0, 0.03], [C6, 0.06], [E6, 0.06], [C6, 0.06], [E6, 0.2]],
  adopt: [[700, 0.12, 'triangle', 950], [950, 0.18, 'triangle', 600], [0, 0.04], [G5, 0.08, 'triangle'], [C6, 0.16, 'triangle']],
  award: [[G5, 0.09], [C6, 0.09], [E6, 0.09], [0, 0.03], [D6, 0.08], [E6, 0.3]],
  coin: [[A5 * 1.5, 0.05], [A5 * 2, 0.12]],
}

mkdirSync(out, { recursive: true })
for (const [name, notes] of Object.entries(CLIPS)) {
  writeFileSync(join(out, `${name}.wav`), wav(render(notes)))
  console.log(`wrote assets/sfx/${name}.wav`)
}
