# claude-kitten

`afk-cat`: an AFK virtual-pet cat game that runs as a Claude Code mod, a plugin of function hooks. `README.md` covers gameplay and the file layout. This file covers what you need to know before changing code.

## Checks: run all four before committing

```bash
claude plugin validate .            # manifest, hooks, $.state keys vs types/index.d.ts
npx -y -p typescript tsc -p .       # the mod (extends .claude-plugin/types/tsconfig.json)
npx -y -p typescript tsc -p web     # the browser runtime (DOM lib)
claude plugin test .                # every hooks/**/*.test.ts
```

`.claude-plugin/types/` is written by the engine when the mod loads and is git-ignored. If it's missing, load the mod once (see below) before running `tsc -p .`.

## How it loads

On this machine `~/.claude/settings.json` sets `env.CLAUDE_CODE_PLUGIN_DIRS` to this folder, so every session loads the repo directly and hot-reloads it when files change. Edit files here; never copy them into `~/.claude/dev-mods/`. A one-off load: `claude --plugin-dir <this folder>`.

## Two runtimes

- **The mod** (`hooks/`): an engine sandbox with no DOM and no Node. Everything outside the mod goes through `$`: `$.store`, `$.fs`, `$.process`, `$.http`, `$.clock`, `$.ui`. JSX compiles against the global `h`.
  - The engine's validator only accepts `$` calls inside functions declared in `hooks/register.tsx`. All wiring lives there.
  - All other modules are pure: they take `(home, now, rng)` and return a new value, with no `$`, no `Date.now()` and no `Math.random()`.
- **The browser arcade** (`web/`, served by `server/arcade.mjs`).
  - `web/*.ts` is bundled into `server/public/arcade.js`, which is committed. **After any change under `web/` or to what it imports (`hooks/arcade/{engine,games,sprites,medals,bridge}`, `hooks/theme.ts`), run `node tools/build-web.mjs` and commit the bundle.**
  - The games in `hooks/arcade/games/*.ts` are shared: the mod reads their medals and `maxScore`, and the browser runs them.
  - `server/arcade.mjs` is plain Node with no dependencies. The mod spawns it with an `ARCADE_TOKEN`.
    - The first stdout line is `{"kind":"ready","port":N}`. After that, browser actions arrive as JSON lines; `parseLine` in `hooks/arcade/bridge.ts` reads them.
    - The mod pushes state to `POST /api/state`.
    - The server listens on 127.0.0.1 only. It checks the token and the Host header and caps request bodies. Keep all of that when adding routes.

## Cat skin (`hooks/skin.ts`)

The `ui.render` hooks on Claude Code's own components pass with `next(e)` when `skin` is `off`. The `ToolUse` hook wraps `await next(e)` and never rebuilds the row.

## Rules for the save (`Home` in `types/index.d.ts`)

- The household is one JSON value under `$.store` key `home`, capped at 4 MiB. It's written through `change()` in `register.tsx`, which:
  - adopts a newer save from another session (`pickBase`, by `rev`);
  - bumps `rev`.

  Never write the store any other way.
- A new field on `Home` needs a default in `newHome` and must survive `migrate` (`hooks/game.ts`, currently `version: 3`). Old saves don't have it.
- Award arcade rounds only through `finishGame` in `hooks/arcade/rewards.ts`. It pays a round only if the mod started it (`arcade.open`), and it clamps both the time and the score, because browser input can't be trusted.
- `/cat export` and `/cat import` (`hooks/backup.ts`) write to `~/.claude-kitten/backups/`. Import backs up the current save first; keep that behaviour.

## Test kit gotchas (`claude-code/testing`)

- The test `$` has no `store`. Use `mock.store(on)`, or stub `store.get` and `store.set` with `on(...)`.
- `clock.advance` replays timers in real time, so keep simulated rounds short (a few seconds).
- `fs` paths reach hooks as absolute, native paths. Stubs should look files up by name (see `hooks/backup.test.ts`).
- Stub `process.spawn` with an async generator that returns `{ value: { code, signal } }`. Stub `process.run` results so they include `isStdoutTruncated` and `isStderrTruncated`.
- Rules tests use `seeded(n)` from `hooks/rng.ts` and a fixed `now`.

## Conventions

- Keep code comments to one or two short lines; doc strings stay under three lines.
- Name booleans `is*`/`has*`. Files use LF line endings (`.gitattributes`).
- Use Conventional Commits with a scope, such as `feat(arcade): …` or `fix(saves): …`.
- Add a README row whenever you add a command, key or game.
