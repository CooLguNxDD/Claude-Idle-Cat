# claude-kitten

An AFK virtual-pet cat that lives inside Claude Code as a mod (a plugin of function hooks).
It's a Tamagotchi with an idle-game loop: look after the cat, earn coins, buy upgrades and come back for streak bonuses.

## Play

```bash
claude --plugin-dir C:\works\MyOSS\claude-kitten
```

Then type `/cat` to open the pane.

| Command / key | What it does |
| --- | --- |
| `/cat` | open the pane |
| `/cat rename <name>` | rename the cat |
| `/cat reset` | start over with a new cat |
| `f` `p` `e` `n` | Feed (5c) · Play · Pet · Nap/Wake |
| `1` `2` `3` | buy Auto-feeder · Yarn toy · Cozy bed |

How the game works:
- Stats drop and coins build up in real time. Time while you're away counts too, up to 8 hours.
- Claude helps: +1c for each tool call, and +3c and +2xp each time Claude finishes a reply.
- A daily check-in bonus grows with your streak (up to 7 days). Random AFK events give extra coins.
- The cat evolves from kitten to cat (red collar) at level 5, and to chonk (gold crown) at level 10.
- The terminal shows an animated pixel-art scene with a day, dusk and night sky that follows your clock. Other surfaces show an ASCII cat.

Progress is saved in the plugin's `$.store`, so it carries over between sessions.

## Theme

Colors come from [Catppuccin](https://catppuccin.com/). Pick a flavor in `/config` → **Catppuccin flavor**:

| Value | Look |
| --- | --- |
| `auto` (default) | Latte when Claude Code's theme is light, Mocha when it's dark |
| `daycycle` | Latte by day, Frappé at dusk, Mocha at night, by your clock |
| `latte` · `frappe` · `macchiato` · `mocha` | always that flavor |

## Layout

```
.claude-plugin/plugin.json   manifest (plugin name: afk-cat)
types/index.d.ts             Cat state contract ($.state)
hooks/hooks.json             names the hooks module
hooks/register.tsx           wiring: session.start, /cat, tool.call, turn.complete, Pane render, timers
hooks/game.ts                pure rules: tick, act, buy, checkIn, evolution
hooks/sprite.ts              pixel-art scene → Raster cells (two pixels per cell, '▀')
hooks/art.ts                 ASCII fallback
hooks/*.test.ts              rule tests + a pane mount test
```

## Develop

```bash
claude plugin validate .
claude plugin test .
```

To type-check, load the plugin once with `--plugin-dir`. That writes `.claude-plugin/types/` (git-ignored). Then run `npx -p typescript@5 tsc -p .`.

The mod API is early access and can change between Claude Code releases. This version was built against 2.1.287.
