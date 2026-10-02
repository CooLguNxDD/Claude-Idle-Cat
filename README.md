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
| `a` | adopt from the shelter |
| `c` `s` `h` `r` | switch tabs: Cat · Skills · Home · Friends |

How the game works:
- Stats drop and coins build up in real time. Time while you're away counts too, up to 8 hours.
- Being away never hurts: stats stop at 25, so cats get grumpy but never sad.
- Every cat has genes: one of 9 coats (ginger, tabby, grey, black, white, cream, calico, tuxedo, siamese), eye color (odd eyes are rare), a personality that changes the rules, and a 1-in-64 chance of being shiny.
- The household starts in a Cottage with room for 2 cats. Every cat earns coins.
- **Home tab** (`h`):
  - Nyan's shop is open 08:00–22:00 by your clock, with 4 new items every day.
  - Furniture goes in yard spots (bowl, bed, toy, rug, plant, something hanging) and changes the rules: an auto-feeder, sleep regen, coin boosts, slower joy decay, more AFK events, bigger gifts.
  - Tom Mew builds a bigger house (House, then Manor) on an interest-free loan. A quarter of income pays it back, and there's no deadline.
  - Stray cats visit the yard, drawn by your decor (each item attracts certain personalities). They sit on the fence for a few hours, leave a gift, and you can adopt them for free.
- Claude helps: +1c for each tool call, and +3c and +2xp each time Claude finishes a reply.
- A daily check-in bonus grows with your streak (up to 7 days). Random AFK events give extra coins.
- Each level gives a skill point for the Skills tab (`s`). There are three branches: **Hunter** (coins, AFK finds, gifts), **Cuddler** (joy, xp) and **Dreamer** (sleep, time away). Resetting skills costs coins.
- Cats grow from kitten to cat (red collar) at level 5. At level 10 they evolve into the form of their strongest branch: **Ninja** (headband), **Royal** (crown and cape) or **Cloud** (halo and wings). A cat with no skills becomes a **Chonk**.
- The terminal shows an animated pixel-art scene with a day, dusk and night sky that follows your clock. Other surfaces show an ASCII cat.

- **Friends tab** (`r`):
  - Each cat has a friendship score with six levels, from Stranger to Best friend. Petting, feeding and playing add to it, up to 10 points a day.
  - You can give each cat one gift a day. Every personality has a favorite, and you find out which by trying.
  - Friendship unlocks a nickname for you (level 3), a catchphrase (level 4) and a photo (level 6).
  - Cats talk. What they say changes through the day, and they remember a favorite gift for a couple of days.
- When you come back after 30+ minutes, the cats greet you with **WELCOME BACK!** and a summary of what happened while you were away.

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
hooks/mods.ts                trait × skill multipliers the rules read
hooks/skills.ts              skill tree, points, evolution forms
hooks/home.ts                furniture catalog, daily shop, house tiers, Tom Mew loan
hooks/visitors.ts            strays: arrivals by decor pull, gifts, departures
hooks/friends.ts             friendship levels, daily gifts, dialogue and memory
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
