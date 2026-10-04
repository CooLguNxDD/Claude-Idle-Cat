# Claude Idle Cat (`claude-kitten`)

`afk-cat`: an AFK virtual-pet cat game that runs as a Claude Code mod, a plugin of function hooks. `README.md` covers gameplay and the file layout. This file covers what you need to know before changing code.

## Checks: run before committing

```bash
claude plugin validate .            # manifest, hooks, $.state keys vs types/index.d.ts
npx -y -p typescript tsc -p .       # the mod (extends .claude-plugin/types/tsconfig.json)
npx -y -p typescript tsc -p web     # the browser runtime (DOM lib)
claude plugin test .                # every hooks/**/*.test.ts
node --test server/arcade.test.mjs   # local routes and browser-location permission flow
node tools/build-content.mjs --check # hooks/content/index.ts lists every content file
node --test tools/release-snapshot.test.mjs # release tag snapshot, notes, and version agreement
```

`.claude-plugin/types/` is written by the engine when the mod loads and is git-ignored. If it's missing, load the mod once (see below) before running `tsc -p .`.

## How it loads

On this machine `~/.claude/settings.json` sets `env.CLAUDE_CODE_PLUGIN_DIRS` to this folder, so every session loads the repo directly and hot-reloads it when files change. Edit files here; never copy them into `~/.claude/dev-mods/`. A one-off load: `claude --plugin-dir <this folder>`.

## Two runtimes

- **The mod** (`hooks/`): an engine sandbox with no DOM and no Node. Everything outside the mod goes through `$`: `$.store`, `$.fs`, `$.process`, `$.http`, `$.clock`, `$.ui`. JSX compiles against the global `h`.
  - The engine's validator only accepts `$` calls inside functions declared in `hooks/register.tsx`. All wiring lives there.
  - All other modules are pure: they take `(home, now, rng)` and return a new value, with no `$`, no `Date.now()` and no `Math.random()`.
- **The browser arcade** (`web/`, served by `server/arcade.mjs`).
  - `web/*.ts` is bundled into `server/public/arcade.js`, which is committed. **After any change under `web/` or to what it imports (`hooks/arcade/{engine,games,render,art,medals,bridge}`, `hooks/art`, `hooks/theme.ts`), run `node tools/build-web.mjs` and commit the bundle.**
  - `server/public/art/*.png` is generated from `tools/build-art.mjs`; regenerate it after changing its source art or theme palettes. The browser draws at 320×180 from a 112×64 simulation world.
  - The games in `hooks/arcade/games/*.ts` are shared: the mod reads their medals and `maxScore`, and the browser runs them.
  - `server/arcade.mjs` is plain Node with no dependencies. The mod spawns it with an `ARCADE_TOKEN`.
    - It also serves the token-protected `/location` page; device coordinates return as a validated `location` stdout message. Browser geolocation runs only after the user clicks its button.
    - Append `&canvas=1` to an authorized arcade URL to inspect the Canvas fallback.
    - The first stdout line is `{"kind":"ready","port":N}`. After that, browser actions arrive as JSON lines; `parseLine` in `hooks/arcade/bridge.ts` reads them.
    - The mod pushes state to `POST /api/state`.
    - The server listens on 127.0.0.1 only. It checks the token and the Host header and caps request bodies. Keep all of that when adding routes.

## Content registries (`hooks/content/`)

- Each breed is one file in `hooks/content/breeds/<id>.ts` (`defineBreed`: label, rarity, theme shades, pattern). Shades are theme tokens or mixes, so every flavor works.
- Each move preset is one file in `hooks/content/moves/<id>.ts` (`defineMove`: pose, cycle, speed, lift, seconds, `when`). `hooks/motion.ts` picks and steps moves; the motion lives in memory in `register.tsx`, never in the save.
- Each world is one file in `hooks/content/worlds/<id>.ts` (`defineWorld`: width per tier, layers, slots, landmarks, perches). The scene draws the sky on the pane and the fence, decor, landmarks and cats on a world-wide `view()` scrolled by the camera.
- Optional `World.scene` selects snowy-cabin, neon-alley, space-station or beach-pier styling in `hooks/scene/styles.ts`; omission preserves the original yard art. Backdrop kinds also include cabins, neon-city, station-windows and ocean. New theme art uses the design-grid pen at every scale, including the terminal fallback. Live weather and festivals remain enabled in every world.
- Each named cat is one file in `hooks/content/cats/<id>.ts` (`defineCat`); it replaces a stray at `appears.odds`, rolled from its own seed so plain strays draw the same numbers.
- A breed's optional `available: { months: [10] }` and a named cat's `appears.available` use the local calendar through `hooks/content/availability.ts`; month numbers run from 1 to 12. Missing metadata means year-round. `rollCoat(rng, now)` and `rollGenes(rng, now)` require a timestamp; apply eligibility only to new arrivals, never existing cats or imports. Every rarity must retain a year-round coat. Full palette uses `YEAR_ROUND_COATS` and keeps its legacy achievement id.
- The registries contain 28 breeds (27 year-round), six worlds and six named cats. Ghost and Boo are October-only arrivals; existing ghost visitors retain their normal stay and adoption eligibility.
- The `breed-gen`, `cat-gen`, `move-gen` and `world-gen` skills in `.claude/skills/` write these files; keep them in step when a spec changes.
- The builder also generates `breed-registry.ts` from the same pinned breed order; browser sprite imports use this isolated registry. After adding or removing a content file run `node tools/build-content.mjs`; it rewrites `index.ts`, keeps existing entries in place and appends new ones, so seeded rolls stay stable.
- `node tools/preview.mjs breed <id>` writes a portrait sheet PNG (rows are flavors); `move <id>` writes one cycle of frames. Look before committing.
- Breeds are drawn in the browser too: rebuild `server/public/arcade.js` after changing one. An unknown coat paints as `FALLBACK_BREED`, so removing a file never breaks a save.

## Themes

`themes/*.json` are generated from `hooks/theme.ts` (`claudeThemeOf`). After any palette or token change run `node tools/build-themes.mjs` and commit them.

## Cat skin (`hooks/skin.ts`)

The `ui.render` hooks on Claude Code's own components pass with `next(e)` when `skin` is `off`. The `ToolUse` hook wraps `await next(e)` and never rebuilds the row. The running-cat band (`hooks/runner.ts`) is repainted by the frame timer in `register.tsx` through `$.ui.blit`; its `toBase64` copies the one in `scene/canvas.ts` so the two can change separately.

## Rules for the save (`Home` in `types/index.d.ts`)

- The household is one JSON value under `$.store` key `home`, capped at 4 MiB. It's written through `change()` in `register.tsx`, which:
  - adopts a newer save from another session (`pickBase`, by `rev`);
  - bumps `rev`.

  Never write the store any other way.
- A new field on `Home` needs a default in `newHome` and must survive `migrate` (`hooks/game.ts`, currently `version: 3`). Old saves don't have it.
- `Home.world` holds only the world id; an unknown id draws the first world. The camera and the cat's motion live in memory in `register.tsx`.
- `Home.weather` stores a rounded location, display units and checked current conditions. Weather is off by default; all HTTP wiring stays in `register.tsx`, and stale or unavailable data falls back to the seasonal yard.
- `Home.shelter` stores successful paid pulls and the latest arrival receipt. Rarity comes from the coat registry. Optional markings/silhouettes default to classic, preserving old cat appearances. Failed adoptions never spend coins, consume RNG, or use a shiny charm.
- Award arcade rounds only through `finishGame` in `hooks/arcade/rewards.ts`. It pays a round only if the mod started it (`arcade.open`), and it clamps both the time and the score, because browser input can't be trusted.
- `/cat export` and `/cat import` (`hooks/backup.ts`) write to `~/.claude-kitten/backups/`. Import backs up the current save first; keep that behaviour.

## Test kit gotchas (`claude-code/testing`)

- The test `$` has no `store`. Use `mock.store(on)`, or stub `store.get` and `store.set` with `on(...)`.
- `clock.advance` replays timers in real time, so keep simulated rounds short (a few seconds).
- `fs` paths reach hooks as absolute, native paths. Stubs should look files up by name (see `hooks/backup.test.ts`).
- Stub `process.spawn` with an async generator that returns `{ value: { code, signal } }`. Stub `process.run` results so they include `isStdoutTruncated` and `isStderrTruncated`.
- Rules tests use `seeded(n)` from `hooks/rng.ts` and a fixed `now`.

## Release

A Claude plugin release is an annotated tag `afk-cat--v<version>`, the name `claude plugin tag` creates. Pushing that tag runs `.github/workflows/plugin-release.yml`. The workflow validates the mod, archives the tagged tree, and opens a GitHub release. The release attaches the plugin zip, its sha256, and `release-snapshot.json` (version, commit, inventory, install URLs, and the commits since the previous tag). The release notes repeat those details in Markdown.

`.claude-plugin/plugin.json` and the `afk-cat` entry in `.claude-plugin/marketplace.json` must use the same `version` string. Bump both, commit, then from a clean checkout:

```bash
claude plugin tag --push
```

`node tools/release-snapshot.mjs --preview` writes the same files under `dist/` before the tag exists. `metadata.claudeCode` in `plugin.json` is the Claude Code version named in the release notes.

## Conventions

- Keep code comments to one or two short lines; doc strings stay under three lines.
- Name booleans `is*`/`has*`. Files use LF line endings (`.gitattributes`).
- Use Conventional Commits with a scope, such as `feat(arcade): …` or `fix(saves): …`.
- Add a README row whenever you add a command, key or game.

## Content modules v2

The append-only barrel has sixteen registries: breeds (28), moves (23), worlds (6), named cats (6), reactions (5), interactions (5), expeditions (7), quests (6), events (2), skills (21), furniture (29), shop (17), materials (7), behaviors (4), goals (4), speech. Speech lines are content files; the spoken line, recent lines and cooldowns live in memory in `register.tsx` and are never written to the save. `hooks/friends.ts` must not import `SPEECH` — the arcade rewards module imports friends, and the arcade bundle stays content-free. Each item is one file. New kinds use schemas and `*Problems()` validators in `hooks/content/progression.ts`, re-exported from `types.ts`. `hooks/content/registries.test.ts` validates every file and reference.

`SKILLS`, `CATALOG`, and `MILES_SHOP` retain their legacy module exports. The first barrel was seeded in the exact old 12-skill, 24-furniture and four-shop order; never sort existing imports. `legacy-fixture.ts` captures the 40-day stock sequence and old skill totals from f199b33. Nyan excludes cost/tier-gated Curio furniture, so appending the late pack preserves stock.

Save version remains 3. `newHome` defaults `bonds`, `quests`, `expeditions`, `materials`, `gear`, `exchanges`, `worlds: ['backyard']` and `bowl: { food: 3 }`. Old v3 saves inherit these through `migrate`. `normalizeWorlds` keeps known ids, adds every free world and grandfathers the current yard. `normalizeBowl` clamps portions to 0–10. `Cat.intent` is optional and `normalizeCat` drops unknown behaviour ids. `normalizeProgression` repairs malformed containers and finite counts, drops invalid/duplicate party runs, and preserves valid frozen loot and inbox receipts. Each run stores its seed, frozen loot, wall-clock end, XP and bond reward. Cats remain reserved until claim, including offline completed runs. Ready runs populate the inbox without auto-claim; its receipts suppress return notifications across reloads. `exchanges` persists pair/visitor daily receipts. `expeditions.done` includes lifetime `material:<id>` totals for achievements.

Pure engines: `reactions.ts` + `reactions/signals.ts`, `pair.ts`, `expeditions.ts`, `quests.ts`, `events.ts`, `shop.ts`, `away.ts`, `goap.ts`, `brain.ts` and `bowl.ts`. `think` runs inside `change()` immediately after `tick`, so the 10s loop and session resume both finish a due intent and may plan once. Motion, pair actors and reaction cooldowns remain in memory. The frame loop animates only the active cat's intent (and a `play-buddy` partner); other cats at home still plan. The 10s tick passes `think` an `isHeld` check (`isOnScreen` in `register.tsx`), so a due intent waits while the active cat is still walking or playing out its move, up to `HOLD_MAX_MS`. Window/shelf landmarks and knead/spin/arch poses are rendered in both scene paths; shelf cups fall cosmetically. Late furniture supplies semantic art rows in its own data file.

`expTime`, `matRolls`, `rareOdds`, `bond`, `party`, `expOffline`, `stardust`, `harmony`, and `oracle` extend skill effects; additive effects start at zero. Furniture expedition multipliers use capped per-item values. Coin loot is capped at 240 coin-rate minutes at departure; duration remains 10–720 minutes after all bonuses.

All sixteen generator skills are byte-identical under `.claude/skills/` and `.agents/skills/`. `speech-gen` writes speech banks. `behavior-gen` and `goal-gen` write GOAP content. Run `node --test tools/content.test.mjs` for mirrors and builder order. Preview supports `interaction <id>` and `furniture <id>` alongside existing kinds. The Expeditions Client keyboard row posts only left/right/return keys to `register.tsx`; all mutations still pass through `change()`.

## Settings menu

`/cat settings` and the Settings tab (`v`) expose every `afk-cat.*` config row from `$.config.list()`, including sound and a preview. Keep namespaced config keys. Host-managed rows show their locked state; denied writes leave runtime values intact. Plugin-origin writes skip the plugin's own hooks, so `setSetting` applies the accepted result explicitly; external `config.set` changes use the shared `applySetting`. World, weather and arcade display preferences still persist through `change()` in the Home save.

Review fixes are recorded in `docs/content-v2-review-fixes.md`. Reactions are best-effort around real tool/turn results. A long test may nap at 20 seconds and celebrate on completion. World expedition gates require the current yard; changing worlds preserves in-flight runs. Unlock validators check achievement ids and map grant tokens, and Miles listings accept only a positive Miles cost. String config rows use the Settings menu’s explicit choice lists when the host does not provide options.
