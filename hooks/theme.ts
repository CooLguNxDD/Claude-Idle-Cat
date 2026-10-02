// Catppuccin palettes (github.com/catppuccin/palette), as 0xRRGGBB.
export type FlavorName = 'latte' | 'frappe' | 'macchiato' | 'mocha'
export type FlavorSetting = 'auto' | 'daycycle' | FlavorName

const NAMES = ['rosewater', 'flamingo', 'pink', 'mauve', 'red', 'maroon', 'peach', 'yellow', 'green', 'teal',
  'sky', 'sapphire', 'blue', 'lavender', 'text', 'subtext1', 'subtext0', 'overlay2', 'overlay1', 'overlay0',
  'surface2', 'surface1', 'surface0', 'base', 'mantle', 'crust'] as const
export type ColorName = (typeof NAMES)[number]
export type Flavor = Record<ColorName, number> & { name: FlavorName; isLight: boolean }

const HEX: Record<FlavorName, string> = {
  latte: 'dc8a78 dd7878 ea76cb 8839ef d20f39 e64553 fe640b df8e1d 40a02b 179299 04a5e5 209fb5 1e66f5 7287fd 4c4f69 5c5f77 6c6f85 7c7f93 8c8fa1 9ca0b0 acb0be bcc0cc ccd0da eff1f5 e6e9ef dce0e8',
  frappe: 'f2d5cf eebebe f4b8e4 ca9ee6 e78284 ea999c ef9f76 e5c890 a6d189 81c8be 99d1db 85c1dc 8caaee babbf1 c6d0f5 b5bfe2 a5adce 949cbb 838ba7 737994 626880 51576d 414559 303446 292c3c 232634',
  macchiato: 'f4dbd6 f0c6c6 f5bde6 c6a0f6 ed8796 ee99a0 f5a97f eed49f a6da95 8bd5ca 91d7e3 7dc4e4 8aadf4 b7bdf8 cad3f5 b8c0e0 a5adcb 939ab7 8087a2 6e738d 5b6078 494d64 363a4f 24273a 1e2030 181926',
  mocha: 'f5e0dc f2cdcd f5c2e7 cba6f7 f38ba8 eba0ac fab387 f9e2af a6e3a1 94e2d5 89dceb 74c7ec 89b4fa b4befe cdd6f4 bac2de a6adc8 9399b2 7f849c 6c7086 585b70 45475a 313244 1e1e2e 181825 11111b',
}

const build = (name: FlavorName): Flavor => {
  const hex = HEX[name].split(' ')
  const colors = Object.fromEntries(NAMES.map((n, i) => [n, parseInt(hex[i] ?? '0', 16)]))
  return { ...(colors as Record<ColorName, number>), name, isLight: name === 'latte' }
}
export const FLAVORS: Record<FlavorName, Flavor> = {
  latte: build('latte'), frappe: build('frappe'), macchiato: build('macchiato'), mocha: build('mocha'),
}
export const FLAVOR_SETTINGS: readonly FlavorSetting[] = ['auto', 'daycycle', 'latte', 'frappe', 'macchiato', 'mocha']

export type DayPart = 'day' | 'dusk' | 'night'
export const dayPartOf = (hour: number): DayPart => (hour < 6 || hour >= 20 ? 'night' : hour >= 17 ? 'dusk' : 'day')

// auto follows Claude Code's theme row ("light", "light-daltonized", …); daycycle follows the clock.
export const resolveFlavor = (setting: string, claudeTheme: string, hour: number): Flavor => {
  if (setting === 'daycycle') {
    const part = dayPartOf(hour)
    return FLAVORS[part === 'day' ? 'latte' : part === 'dusk' ? 'frappe' : 'mocha']
  }
  if (setting in FLAVORS) return FLAVORS[setting as FlavorName]
  return claudeTheme.includes('light') ? FLAVORS.latte : FLAVORS.mocha
}

export const mix = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t) << s
  return ch(16) | ch(8) | ch(0)
}
export const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`

// Dark line color that reads on both light and dark flavors.
export const inkOf = (f: Flavor) => (f.isLight ? f.text : f.crust)

// Semantic UI colors for Text elements.
export const uiTokens = (f: Flavor) => ({
  title: css(f.lavender), accent: css(f.mauve), muted: css(f.overlay1), ok: css(f.green),
  warn: css(f.yellow), bad: css(f.red), coin: css(f.yellow), log: css(f.subtext0),
})
