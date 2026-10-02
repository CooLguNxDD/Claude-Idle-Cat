import { expect, test } from 'claude-code/testing'

import { CLIP_FOR, clipAsset, powershellArgv } from './sfx'

test('Windows playback points PowerShell at the clip inside the plugin', async () => {
  const argv = powershellArgv('C:/Users/me/claude-kitten/', 'levelup')
  expect(argv[0]).toBe('powershell')
  expect(argv.at(-1)).toBe("(New-Object Media.SoundPlayer 'C:\\Users\\me\\claude-kitten\\assets\\sfx\\levelup.wav').PlaySync()")
  expect(powershellArgv("C:\\it's\\here", 'coin').at(-1)).toMatch(/it''s/)
  expect(clipAsset('award')).toBe('assets/sfx/award.wav')
})

test('only big moments make a sound', async () => {
  expect(CLIP_FOR.levelup).toBe('levelup')
  expect(CLIP_FOR.hearts).toBeUndefined()
  expect(CLIP_FOR.coins).toBeUndefined()
})
