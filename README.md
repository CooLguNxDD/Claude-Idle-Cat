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
| `/cat rename <name>` | rename the active cat |
| `/cat adopt [name]` | adopt a new cat with random genes (also `a` in the pane) |
| `/cat switch <name>` | bring another cat front and centre (or click its name) |
| `/cat reset` | start over with a new household |
| `f` `p` `e` `n` | Feed (5c) · Play · Pet · Nap/Wake |
| `1` `2` `3` | buy Auto-feeder · Yarn toy · Cozy bed |

How the game works:
- Stats drop and coins build up in real time. Time while you're away counts too, up to 8 hours.
- Being away never hurts: stats stop at 25, so cats get grumpy but never sad.
- Every cat has genes: one of 9 coats (ginger, tabby, grey, black, white, cream, calico, tuxedo, siamese), eye color (odd eyes are rare), a personality that changes the rules, and a 1-in-64 chance of being shiny.
- The household starts with room for 2 cats. Every cat earns coins.
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
types/index.d.ts             Home and Cat state contract ($.state)
hooks/hooks.json             names the hooks module
hooks/register.tsx           wiring: session.start, /cat, tool.call, turn.complete, Pane render, timers
hooks/game.ts                pure rules: tick, act, buy, checkIn, evolution
hooks/scene.ts               pixel-art scene → Raster cells (two pixels per cell, '▀')
hooks/genes.ts               coats, eyes, personalities, shiny odds, coat painting
hooks/mods.ts                trait multipliers the rules read
hooks/rng.ts                 seeded random numbers (repeatable tests)
hooks/theme.ts               Catppuccin palettes and flavor resolution
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
