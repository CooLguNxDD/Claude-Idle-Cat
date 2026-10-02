# AGENTS.md

Agent instructions for Claude Idle Cat live in [CLAUDE.md](./CLAUDE.md). Read it before making any change.

@CLAUDE.md

Quick essentials (full detail in CLAUDE.md):

- Run checks before committing:
  ```bash
  claude plugin validate .
  npx -y -p typescript tsc -p .
  npx -y -p typescript tsc -p web
  claude plugin test .
  node --test server/arcade.test.mjs
  ```
- Two runtimes:
  - Mod (`hooks/`): sandbox where everything external goes through `$` inside `hooks/register.tsx`. All other modules are pure `(home, now, rng)`.
  - Browser arcade (`web/`, served by `server/arcade.mjs`): after changes to `web/` or shared imports, run `node tools/build-web.mjs` and commit `server/public/arcade.js`.
- Separate git repo: never mix commits across sibling projects.
