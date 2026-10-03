# 😺 Claude Idle Cat

> *Once upon a time, a stray cat lived in a cardboard box. Poor. Broke. Zero coins, one very damp box.*
> *So the cat did what cats do best: it built its own playground from the ground up. A cat tower. A cat pipeline. A cat tunnel. All of it from scratch, one coin at a time.* 🏗️🐾

`afk-cat`: An AFK virtual-pet cat that lives inside Claude Code as a mod (a plugin of function hooks).
It's a Tamagotchi with an idle-game loop: look after the cat, earn coins, buy upgrades and come back for streak bonuses. Claude does the work, the cat does the napping. Everybody wins.

## 🎮 Play

```bash
claude --plugin-dir ./claude-kitten
```

Then type `/cat` to open the pane. Meow.

| Command / key | What it does |
| --- | --- |
| `/cat` (or `/cat show`) | open the pane (knock, knock) |
| `/cat hide` | close the pane (the cats keep earning, they're professionals) |
| `/cat help` | list the commands |
| `/cat rename <name>` | rename the active cat |
| `/cat shelter` | open the Adopt tab without spending coins (window shopping is free) |
| `/cat adopt [name]` | roll and adopt a shelter cat, optionally with a chosen name |
| `/cat switch [name]` | bring another cat front and centre; no name cycles to the next (or pick it from the cat list, `w` in the pane) |
| `/cat reset` | start over with a new household (back to the cardboard box!) |
| `/cat theme <flavor>` | switch Claude Code itself to the Catppuccin theme (`latte` · `frappe` · `macchiato` · `mocha`); see Claude Code theme |
| `/cat export [file]` | save a backup; default `~/.claude-kitten/backups/afk-cat-<date>.json` |
| `/cat import <file>` | load a backup; your current save is backed up first (`…-before-import.json`) |
| `/cat weather [city]` | open Weather; search a city and choose the matching location |
| `/cat weather choose <1–5>` | select a city from the search results |
| `/cat weather at <latitude> <longitude>` | set a location by coordinates |
| `/cat weather system` | open the browser’s device-location permission page |
| `/cat weather refresh` | update weather now (at most once per minute) |
| `/cat weather units c\|f` | choose Celsius/km/h or Fahrenheit/mph |
| `/cat weather off` | stop weather requests and clear the saved location |
| `/cat world [id]` | list the worlds, or move the yard to another world file |
| `f` `e` `n` | Feed (5c) · Pet · Nap/Wake |
| `j` / `l` / `0` | (Cat tab) pan the yard left / right · follow the cat again (it resumes on its own after 10 s) |
| `p` | Play: opens the Arcade in your browser |
| `o` | (Arcade tab) open or reopen the browser arcade |
| `w` | open/close the cat list |
| `‹` / `›` in the top bar | previous / next tab; wraps at either end, with tabs fitting on one line |
| `q` / `↶` in the top bar | go back to the previously visited tab |
| `c` `a` `s` `h` `r` `b` `m` `g` `t` | shortcuts for visible tabs: Cat · Adopt · Skills · Home · Friends · Book · Miles · Arcade · Weather |
| Arcade Display menu / Fullscreen | fit the 320×180 art canvas to the window, choose a 1×–6× size (up to 1080p), or fill the screen |

### 💾 Saves

- The household is one JSON save in the mod's store, written on every change.
- Each save carries a revision number. With Claude Code open in two places, a session first loads a newer save the other one wrote, so progress isn't overwritten. (No cat gets left behind.)
- `/cat export` and `/cat import` move the cats between machines or plugin installs. Cats travel well.

## 🐾 How the game works

Short version: stats drop, coins pile up, cats judge you silently.

- Stats drop and coins build up in real time. Time while you're away counts too, up to 8 hours.
- Being away never hurts: stats stop at 25, so cats get grumpy but never sad. They'll forgive you. Eventually.
- Every cat has genes: one of 18 coats (each one a breed file in `hooks/content/breeds/`), five possible markings, three silhouettes (classic, fluffy, folded ears), eye color, a personality that changes the rules, and a 1-in-64 chance of being shiny ✨. Existing cats retain their original appearance.
- The household starts in a Cottage with room for 2 cats. Every cat earns coins. Yes, even the lazy one.

### 📦 Adopt tab (top-bar arrows, or `/cat shelter`)

*Somewhere out there is a cat in a box. Maybe it's your next one.*

- Roll & adopt opens a pixel parcel and reveals one cat, its rarity and genes. The fee stays at 100c per cat already in your household. It is charged only on success; full houses and insufficient coins consume no roll or shiny charm.
- Rarity odds: **Common 60%**, **Uncommon 25%**, **Rare 10%**, **Epic 4%**, **Legendary 1%**. Coats within a tier have equal odds; the full pool is visible in the tab. Rarity describes appearance and does not change stats or income.
- New coats include chocolate, cinnamon, silver, smoke, tortoiseshell, ragdoll, bengal, lynx and the starry Nebula 🌌. Markings and silhouettes roll independently. Duplicate coats are possible, and every successful pull adds a cat; cats are never replaced.
- Shiny is a separate 1/64 roll in every rarity tier. The Paw Miles shiny charm guarantees the next successful shelter adoption is shiny.
- The tab keeps your latest arrival card, a Meet button, shelter-pull count, house expansion link and free adoption of yard visitors. `q` returns to the tab you came from.

### 🏠 Home tab (`h`)

*Build the playground. Piece by piece. Coin by coin.*

- Nyan's shop is open 08:00–22:00 by your clock, with 4 new items every day.
- Furniture goes in yard spots (bowl, bed, toy, rug, plant, something hanging) and changes the rules: an auto-feeder, sleep regen, coin boosts, slower joy decay, more AFK events, bigger gifts.
- The yard is wider than the pane and grows with the house: 80 columns for the Cottage, 160 for the House, 240 for the Manor. The view follows the cat; a strip along the top shows where you are. The House unlocks a cat tower and a tunnel, the Manor a big pipe to lounge on, and the cat visits all of them by itself.
- Tom Mew builds a bigger house (House, then Manor) on an interest-free loan. A quarter of income pays it back, and there's no deadline. Best landlord in town.
- Stray cats visit the yard, drawn by your decor (each item attracts certain personalities). They sit on the fence for a few hours, leave a gift, and you can adopt them for free. Remember, you were one once.

### 🎁 Claude helps, and other ways to get paid

- Claude helps: +1c for each tool call, and +3c and +2xp each time Claude finishes a reply.
- A daily check-in bonus grows with your streak (up to 7 days). Random AFK events give extra coins.
- Each level gives a skill point for the Skills tab (`s`). There are three branches: **Hunter** (coins, AFK finds, gifts), **Cuddler** (joy, xp) and **Dreamer** (sleep, time away). Resetting skills costs coins.
- Cats grow from kitten to cat (red collar) at level 5. At level 10 they evolve into the form of their strongest branch: **Ninja** 🥷 (headband), **Royal** 👑 (crown and cape) or **Cloud** ☁️ (halo and wings). A cat with no skills becomes a **Chonk**. (No shame. Chonk is a lifestyle.)
- The terminal shows an animated pixel-art scene with a day, dusk and night sky that follows your clock. Other surfaces show an ASCII cat.
- The active cat roams the yard on its own: it walks, trots, hops, pounces, grooms, stretches, loafs and gets the zoomies, picking moves by mood, personality and time of day. Hungry cats head for the bowl, tired ones for the bed, and a napping cat pads to its bed first.

### 💕 Friends tab (`r`)

- Each cat has a friendship score with six levels, from Stranger to Best friend. Petting, feeding and playing add to it, up to 10 points a day.
- You can give each cat one gift a day. Every personality has a favorite, and you find out which by trying.
- Friendship unlocks a nickname for you (level 3), a catchphrase (level 4) and a photo (level 6).
- Cats talk. What they say changes through the day, and they remember a favorite gift for a couple of days.

### 📖 Book tab (`b`)

- While you're away, cats bring home critters: 16 bugs, fish and mice that follow real seasons and hours, as in Animal Crossing. The Hunter branch raises the odds. 🐟🐛🐭
- Donate one of each to the museum for Paw Miles, and sell extras for coins.
- The cat book records every coat, form, shiny, stray and best-friend photo you've seen.

### 🏅 Miles tab (`m`)

- Five Paw Miles tasks a day, such as "pet 3 times" or "Claude runs 10 tools".
- 20 achievements, three of them from the arcade, plus a Full palette reward for seeing every coat.
- A Miles shop with exclusive furniture and a shiny charm.

### 🕹️ Arcade tab (`g`, or Play `p`)

*Zoomies, but with a high score.*

- The games run in your browser. `p` (or a game in the Arcade tab) starts a small local server and opens a tab at `http://localhost:<port>`. The pane keeps the game list, the round in progress and the results.
- The games are drawn on a 320×180 pixel-art canvas, scaled in whole-pixel steps up to 1920×1080. The Display menu offers fit or 1×–6× sizes (clamped to the window); Fullscreen fills the display. WebGL adds glow and an optional CRT look (`G` and `C`). Without WebGL the page falls back to a plain canvas.
- Game rules still use a 112×64 coordinate world, keeping round timing, controls, medals and existing best scores comparable. Each game's layered background has a Catppuccin variant and a code-drawn fallback.
- The active cat stars in its own coat. Esc quits a round. The simulation runs at a fixed 60 Hz. Glow and CRT choices are saved with your cats.
- Needs Node.js on your PATH. The server listens on 127.0.0.1 only, needs a per-session token, and shuts down two minutes after Claude Code goes away.

The games:
- **Rooftop Dash** 🏃: jump flowerpots (space/↑), duck pigeons (↓) and grab fish treats while the rooftops speed up.
- **Fish Catch** 🐟: slide the bowl (←/→ or mouse) under falling fish. Boots cost points; three cucumbers end the round.
- **Laser Chase** 🔴: click the darting red dot (or aim with the arrows and press space) to pounce. Catches in a row multiply.
- **Whack-a-Mouse** 🐭: bop mice as they pop out of a 3×3 board (keys 1–9 or click), and leave the slipper alone.
- **Cat Tank** 🐠: click the water to drop food. Fed fry grow into fish and then golden fish, which drop silver and gold coins; click them before they settle. `b` spends 20 on another fry. A crow raids twice a round after a red flash; click it to swat it before it takes a fish.
- **Cats vs Mice** 🌿: a Plants vs Zombies-style lane defence. Spend catnip on cards (keys 1–3, then click a cell): yarn throwers shoot, napping cats block and dream up catnip, and box traps catch the first mouse in. Click falling catnip. Two waves, then a flag wave with rats; every lane you hold pays a bonus.

Rewards and rules:
- A round costs 10 energy. Bronze, silver and gold medals pay a few minutes of the household's income plus xp, for 3 paid plays per game a day. Every round adds joy and friendship. One featured game a day pays 2×.
- 🎁 Arcade prizes: every paid round rolls for a bonus. 15% with no medal, 25% bronze, 35% silver, 50% gold. The prize is one of a coin purse, a new trick (xp), a tuna snack (hunger), the zoomies (energy), a victory cuddle (friendship past the daily cap) or a prize capsule with a critter for your pocket. Each personality is twice as likely to win the prize it loves.
- Skills make games easier rather than paying more. For example, Dreamer points slow Dash's speed-up.
- Quick play is still there: it tosses the yarn ball for instant joy. 🧶

### 🗓️ Calendar

- The yard follows the real calendar: snow in winter, cherry petals in spring, fireflies on summer nights, falling leaves in autumn, pumpkins in October and string lights in December.
- Nyan stocks seasonal furniture only in its season.
- Each cat has a yearly birthday on the anniversary of the day it joined: a party hat and a coin gift. 🎂
- **Catnip market** (in Home): Daisy Meow sells catnip on Sunday mornings (05:00–12:00). Nyan buys it Monday to Saturday at prices that swing twice a day. Unsold catnip spoils after Saturday.

### ⏰ Time stuff

- Daily resets (shop stock, tasks, gifts, streak) happen at your local midnight.
- When you come back after 30+ minutes, the cats greet you with **WELCOME BACK!** and a summary of what happened while you were away. 🎉

Progress is saved in the plugin's `$.store`, so it carries over between sessions.

## 🎨 Theme

Colors come from [Catppuccin](https://catppuccin.com/) (the cat-themed palette, obviously). Pick a flavor in `/config` → **Catppuccin flavor**:

| Value | Look |
| --- | --- |
| `auto` (default) | Latte when Claude Code's theme is light, Mocha when it's dark |
| `daycycle` | Latte by day, Frappé at dusk, Mocha at night, by your clock |
| `latte` · `frappe` · `macchiato` · `mocha` | always that flavor |

## 🖌️ Claude Code theme

The plugin also ships four Claude Code color themes, `themes/catppuccin-<flavor>.json`, which recolor the whole interface: accent, prompt border, diffs, message backgrounds and subagent colors. Pick one with `/theme` (or `/cat theme mocha`). Restart Claude Code once after installing so it loads them. With the flavor on `auto`, the cats then follow the theme you picked.

Regenerate the files after changing a palette: `node tools/build-themes.mjs`.

## 🐱 Cat interface

Claude Code's own screen gets a cat skin. Pick a level in `/config` → **Cat interface**:

| Value | What changes |
| --- | --- |
| `full` (default) | everything below |
| `light` | the spinner word ("Purring…", "Pouncing…"), the turn line ("Napped for 3s") and a cat badge on the hint line (`ᓚᘏᗢ Mochi ∝▆ ♥▇ ϟ▅ ¢120`) |
| `off` | Claude Code looks as it always does |

The **cat badge** draws the active cat as `ᓚᘏᗢ` in its own coat colors (a calico is patchy, a siamese has dark points), with `✧` if it's shiny and `ᶻᶻ` while it naps. Its needs show as tiny meters instead of words: `∝` food, `♥` joy and `ϟ` energy, each bar green, yellow or red as it drops. Coins come last.

`full` also adds:
- **Running cat**: a pixel-art cat in the active cat's coat gallops along a band above the prompt while Claude works, kicking up dust, and wraps when it catches the fish. It sprints for a couple of seconds on every tool call. The band needs 5 free rows and a terminal at least 30 columns wide; otherwise a small `=^.^=` walks along one row. The band gives way to surveys.
- A paw on each tool row (🐟 Read/Grep, 🧶 Edit/Write, 🐭 Bash, 🐾 other) and a reworded ctrl+b pill; your own key binding stays.

## 🖼️ Pane canvas

In kitty and Ghostty the pane's scene draws as a real pixel picture at 4× the half-block detail, with banners in a tiny pixel font. Other terminals keep the half-block scene. Pick a mode in `/config` → **Pane canvas**:

| Value | What it does |
| --- | --- |
| `auto` (default) | a picture where the terminal can show one, half-block cells elsewhere |
| `image` | always a picture |
| `text` | always half-block cells |

The picture's art is a spec, not a bitmap: shapes are laid out on a design grid of 4 units per scene pixel and rasterized at whatever scale the canvas has, so edges, outlines and dithering stay pixel-sharp at every size. `PICTURE_SCALE` in `hooks/scene.ts` sets the detail (2, 4 or 8 all render from the same spec).

## 🔊 Sound

Short chiptune clips play on level-up, evolution, adoption, achievements, birthdays, gifts and critter finds. Turn them off in `/config` → **Sound effects**.
- **macOS:** clips play through Claude Code's audio player.
- **Windows:** Claude Code has no player there, so the mod plays the same WAV files through PowerShell's `SoundPlayer`.
- **Linux:** silent. (The cat is sneaking.)

The clips are original, generated by `node tools/gen-sfx.mjs` into `assets/sfx/`.

## ⛅ Weather

Open the **Weather tab** using the top-bar arrows (`t` when visible) and enter a city, such as `London, GB`, or use `/cat weather London, GB`. Choose the city from the results. Coordinates also work: `/cat weather at 51.50 -0.12`.

**Use device location…** opens a local browser page. Its button requests browser location permission and uses system location services when available. If permission is denied or the device cannot supply a location, enter a city instead. Device lookup needs Node.js; manual city weather works directly through the plugin. The saved location stays fixed until you choose another city or update device location.

Weather comes from [Open-Meteo](https://open-meteo.com/), whose free non-commercial API needs no key. City search uses [GeoNames via Open-Meteo](https://open-meteo.com/en/docs/geocoding-api). Forecast conditions refresh every 15 minutes. Failed requests retry after 5 minutes; cached conditions remain usable for up to 3 hours, then the yard returns to its seasonal scene. Weather is off until you choose a location.

The pane shows temperature and wind, and layers clouds, fog, rain, puddles, snow, lightning and blowing leaves into its pixel scene. Day/night follows the selected location. Live weather replaces decorative winter snowfall; weather changes are cosmetic and do not change pet stats or rewards. (Rain looks great from inside the box. Err, house.)

Locations are rounded to two decimal places, sent to Open-Meteo, and stored with your cats (including exports). **Off** clears the saved location and cached weather. The Weather tab also provides refresh and °C/°F buttons.

## 🗺️ Layout

Where everything lives in the playground:

```
.claude-plugin/plugin.json   manifest (plugin name: afk-cat)
types/index.d.ts             Home and Cat state contract ($.state)
hooks/hooks.json             names the hooks module
hooks/register.tsx           wiring: session.start, /cat, tool.call, turn.complete, Pane render, timers
hooks/ui/                   tab registry, single-row layout and visit-history router
hooks/game.ts                pure rules: tick, act, buy, checkIn, evolution
hooks/scene.ts + scene/      terminal pixel-art scene → Raster cells (two pixels per cell, '▀')
hooks/art/                  typed cat, furniture and background registry
hooks/weather/              location search, API parsing, condition mapping and cached weather state
hooks/scene/weather/        registered sky, ground and foreground weather layers
hooks/scene/season.ts        seasonal particles when live weather permits them
hooks/genes.ts               coats, eyes, personalities, shiny odds, coat painting
hooks/genes/paint.ts         themed coat colors and deterministic markings
hooks/adoption/             rarity/coat registry and shelter receipts
hooks/content/breeds/*.ts    one file per coat: label, rarity, theme shades and pattern
hooks/content/moves/*.ts     one file per move preset: pose, cycle, speed, lift, duration and when it is picked
hooks/content/worlds/*.ts    one file per world: width per tier, far layers, furniture slots, landmarks, fence perches
hooks/world.ts + camera.ts   pure world lookup, landmark unlocks and the follow/pan camera
hooks/scene/layers.ts        parallax hills, trees and rooftops; scene/landmarks.ts draws the tower, tunnel and pipe
hooks/motion.ts              pure move planner: picks the next move and steps the cat's position each frame
hooks/content/index.ts       generated list of every content file (build: node tools/build-content.mjs)
hooks/scene/shelter.ts       parcel opening and adoption reveal scene
hooks/scene/font.ts          3x5 pixel font for text drawn on the picture canvas
hooks/scene/hicat.ts         the active cat's spec for the picture canvas, built from shapes
hooks/scene/fine/            the picture's art spec: a design grid pen, sky, yard, seasons, weather
hooks/mods.ts                trait × skill multipliers the rules read
hooks/skills.ts              skill tree, points, evolution forms
hooks/home.ts                furniture catalog, daily shop, house tiers, Tom Mew loan
hooks/visitors.ts            strays: arrivals by decor pull, gifts, departures
hooks/friends.ts             friendship levels, daily gifts, dialogue and memory
hooks/critters.ts            seasonal critters, finding, museum donations, selling
hooks/collection.ts          cat book, Paw Miles tasks, achievements, miles shop
hooks/calendar.ts            seasons, festivals, birthdays, catnip market
hooks/time.ts                local-midnight day numbers
hooks/runner.ts              the running-cat band: sprite frames, track, Raster cells
hooks/skin.ts                cat skin: spinner words, hint tail, walking band, tool paws
hooks/sfx.ts                 which moments make a sound, clip paths, Windows playback argv
hooks/arcade/engine.ts       pixel framebuffer, half-block runs, particles, shake, easing
hooks/arcade/bridge.ts       what the mod and the browser exchange: snapshots, server lines, token, URL
server/arcade.mjs            local web server: serves the arcade, relays starts/results as stdout lines
server/public/               arcade page, CSS, built bundle and four-flavor PNG art
server/public/location.*    browser permission page for device location
server/arcade.test.mjs       local-server and browser-location tests
web/*.ts                     browser runtime: game loop, input, WebGL renderer (build: node tools/build-web.mjs)
hooks/arcade/games/*.ts      the six mini-games (pure: init, step, score)
hooks/arcade/render/*.ts     focused renderers for each game
hooks/arcade/art/*.ts        editable pixel-grid sprites and animation frames
hooks/arcade/rewards.ts      energy cost, medals, daily paid plays, featured game, score checks
hooks/arcade/prizes.ts       random prizes a paid round can win for the cat
assets/sfx/*.wav             the clips
tools/gen-sfx.mjs            regenerates the clips
tools/build-art.mjs          regenerates 24 deterministic 320×180 PNG backgrounds
tools/build-content.mjs      regenerates hooks/content/index.ts; --check fails when it is stale
tools/preview.mjs            renders a breed's portrait sheet, a move's frame strip or a world panorama to a PNG for a look before committing
tools/build-themes.mjs       writes themes/*.json (Claude Code custom themes) from hooks/theme.ts
themes/*.json                the four Catppuccin Claude Code themes (generated, committed)
hooks/rng.ts                 seeded random numbers (repeatable tests)
hooks/theme.ts               Catppuccin palettes and flavor resolution
hooks/art.ts                 ASCII fallback
hooks/*.test.ts              rule tests + a pane mount test
```

## 🔧 Develop

Want to build a tunnel of your own? Run these before you commit:

```bash
claude plugin validate .
claude plugin test .
node --test server/arcade.test.mjs
node tools/build-content.mjs --check
node tools/build-art.mjs
node tools/build-web.mjs
```

To type-check, load the plugin once with `--plugin-dir`. That writes `.claude-plugin/types/` (git-ignored). Then run `npx -p typescript@5 tsc -p .`.

The mod API is early access and can change between Claude Code releases. This version was built against 2.1.287.

---

*From a cardboard box to a cat tower. Not bad for a broke stray.* 😸
