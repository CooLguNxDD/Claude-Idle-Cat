import type { EffectKind } from '../types'

export type Clip = 'levelup' | 'evolve' | 'adopt' | 'award' | 'coin'

// Which moments make a sound; everyday effects stay quiet.
export const CLIP_FOR: Partial<Record<EffectKind, Clip>> = {
  levelup: 'levelup', evolve: 'evolve', adopt: 'adopt', award: 'award', birthday: 'award', gift: 'coin', catch: 'coin',
}

export const clipAsset = (clip: Clip) => `assets/sfx/${clip}.wav`

// $.audio.play needs afplay (macOS); on Windows, PowerShell's SoundPlayer plays the same file.
export const powershellArgv = (pluginRoot: string, clip: Clip) => {
  const path = `${pluginRoot.replace(/[\\/]+$/, '')}/${clipAsset(clip)}`.replace(/\//g, '\\').replace(/'/g, "''")
  return ['powershell', '-NoProfile', '-NonInteractive', '-Command', `(New-Object Media.SoundPlayer '${path}').PlaySync()`]
}
