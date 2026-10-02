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
| `/cat` (or `/cat show`) | open the pane |
| `/cat hide` | close the pane (the cats keep earning) |
| `/cat help` | list the commands |
| `/cat rename <name>` | rename the active cat |
| `/cat adopt [name]` | adopt a new cat with random genes (also `a` in the pane) |
| `/cat switch [name]` | bring another cat front and centre; no name cycles to the next (or pick it from the cat list, `w` in the pane) |
| `/cat reset` | start over with a new household |
| `f` `e` `n` | Feed (5c) · Pet · Nap/Wake |
| `p` | Play: opens the Arcade in your browser |
| `o` | (Arcade tab) open or reopen the browser arcade |
| `a` | adopt from the shelter |
| `w` | open/close the cat list |
| `c` `s` `h` `r` `b` `m` `g` | switch tabs: Cat · Skills · Home · Friends · Book · Miles · Arcade |

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
- **Book tab** (`b`):
  - While you're away, cats bring home critters: 16 bugs, fish and mice that follow real seasons and hours, as in Animal Crossing. The Hunter branch raises the odds.
  - Donate one of each to the museum for Paw Miles, and sell extras for coins.
  - The cat book records every coat, form, shiny, stray and best-friend photo you've seen.
- **Miles tab** (`m`):
  - Five Paw Miles tasks a day, such as "pet 3 times" or "Claude runs 10 tools".
  - 19 achievements, three of them from the arcade.
  - A Miles shop with exclusive furniture and a shiny charm.
- **Arcade tab** (`g`, or Play `p`):
  - The games run in your browser. `p` (or a game in the Arcade tab) starts a small local server and opens a tab at `http://localhost:<port>`. The pane keeps the game list, the round in progress and the results.
  - The games are drawn with WebGL: crisp pixel art scaled to fit, with a glow on bright pixels. `C` turns on a CRT look (curved screen, scanlines) and `G` toggles the glow. Without WebGL the page falls back to a plain canvas.
  - The active cat stars in its own coat. Esc quits a round. The simulation runs at a fixed 60 Hz.
  - Needs Node.js on your PATH. The server listens on 127.0.0.1 only, needs a per-session token, and shuts down two minutes after Claude Code goes away.
  - **Rooftop Dash**: jump flowerpots (space/↑), duck pigeons (↓) and grab fish treats while the rooftops speed up.
  - **Fish Catch**: slide the bowl (←/→ or mouse) under falling fish. Boots cost points; three cucumbers end the round.
  - **Laser Chase**: click the darting red dot (or aim with the arrows and press space) to pounce. Catches in a row multiply.
  - **Whack-a-Mouse**: bop mice as they pop out of a 3×3 board (keys 1–9 or click), and leave the slipper alone.
  - **Cat Tank**: click the water to drop food. Fed fry grow into fish and then golden fish, which drop silver and gold coins; click them before they settle. `b` spends 20 on another fry. A crow raids twice a round after a red flash; click it to swat it before it takes a fish.
  - **Cats vs Mice**: a Plants vs Zombies-style lane defence. Spend catnip on cards (keys 1–3, then click a cell): yarn throwers shoot, napping cats block and dream up catnip, and box traps catch the first mouse in. Click falling catnip. Two waves, then a flag wave with rats; every lane you hold pays a bonus.
  - A round costs 10 energy. Bronze, silver and gold medals pay a few minutes of the household's income plus xp, for 3 paid plays per game a day. Every round adds joy and friendship. One featured game a day pays 2×.
  - Skills make games easier rather than paying more. For example, Dreamer points slow Dash's speed-up.
  - Quick play is still there: it tosses the yarn ball for instant joy.
- **Calendar**:
  - The yard follows the real calendar: snow in winter, cherry petals in spring, fireflies on summer nights, falling leaves in autumn, pumpkins in October and string lights in December.
  - Nyan stocks seasonal furniture only in its season.
  - Each cat has a yearly birthday on the anniversary of the day it joined: a party hat and a coin gift.
  - **Catnip market** (in Home): Daisy Meow sells catnip on Sunday mornings (05:00–12:00). Nyan buys it Monday to Saturday at prices that swing twice a day. Unsold catnip spoils after Saturday.
- Daily resets (shop stock, tasks, gifts, streak) happen at your local midnight.
- When you come back after 30+ minutes, the cats greet you with **WELCOME BACK!** and a summary of what happened while you were away.

Progress is saved in the plugin's `$.store`, so it carries over between sessions.

## Theme

Colors come from [Catppuccin](https://catppuccin.com/). Pick a flavor in `/config` → **Catppuccin flavor**:

| Value | Look |
| --- | --- |
| `auto` (default) | Latte when Claude Code's theme is light, Mocha when it's dark |
| `daycycle` | Latte by day, Frappé at dusk, Mocha at night, by your clock |
| `latte` · `frappe` · `macchiato` · `mocha` | always that flavor |

## Sound

Short chiptune clips play on level-up, evolution, adoption, achievements, birthdays, gifts and critter finds. Turn them off in `/config` → **Sound effects**.
- **macOS:** clips play through Claude Code's audio player.
- **Windows:** Claude Code has no player there, so the mod plays the same WAV files through PowerShell's `SoundPlayer`.
- **Linux:** silent.

The clips are original, generated by `node tools/gen-sfx.mjs` into `assets/sfx/`.

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
hooks/critters.ts            seasonal critters, finding, museum donations, selling
hooks/collection.ts          cat book, Paw Miles tasks, achievements, miles shop
hooks/calendar.ts            seasons, festivals, birthdays, catnip market
hooks/time.ts                local-midnight day numbers
hooks/sfx.ts                 which moments make a sound, clip paths, Windows playback argv
hooks/arcade/engine.ts       pixel framebuffer, half-block runs, particles, shake, easing
hooks/arcade/bridge.ts       what the mod and the browser exchange: snapshots, server lines, token, URL
server/arcade.mjs            local web server: serves the arcade, relays starts/results as stdout lines
server/public/               the arcade page and its built bundle (arcade.js)
web/*.ts                     browser runtime: game loop, input, WebGL renderer (build: node tools/build-web.mjs)
hooks/arcade/games/*.ts      the six mini-games (pure: init, step, draw, score)
hooks/arcade/rewards.ts      energy cost, medals, daily paid plays, featured game, score checks
assets/sfx/*.wav             the clips
tools/gen-sfx.mjs            regenerates the clips
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
