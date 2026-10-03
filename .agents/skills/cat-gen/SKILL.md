---
name: cat-gen
description: Create a named cat character (fixed genes, bio, catchphrase) for Codex Idle Cat that visits the yard as a rare stray and can be adopted. Use when asked to generate, design or add a specific cat, character or NPC.
---

# cat-gen: add a named cat

A named cat is one file in `hooks/content/cats/<id>.ts`. When a stray arrives, each named cat whose world matches gets a roll at `appears.odds` (seeded by the visit, so plain strays are unchanged). If it wins, the stray is that cat: its name, genes and catchphrase. Adopting it from the fence copies it into the household like any stray.

## 1. Design the character

From the description, decide:

- **name** (at most 20 characters, unique among named cats) and an **id** in kebab-case.
- **genes**:
  - `coat`: an existing breed id from `hooks/content/breeds/`. If none fits, run the **breed-gen** skill first, then come back.
  - `eyes`: `green` `yellow` `blue` `odd`.
  - `personality`: `lazy` `playful` `greedy` `shy` `cuddly` `curious`. It changes the rules the cat follows, so match it to the character.
  - Optional `marking`: `classic` `socks` `blaze` `mask` `spots`. Optional `silhouette`: `classic` `fluffy` `fold`. Both default to classic.
- **bio** (under 80 characters) and **catchphrase** (under 40), in the README's playful stray-cat voice.
- **availability**: optionally add `appears.available: { months: [10] }`. Use nonempty month lists containing integers from 1 to 12. The arrival date uses the local calendar, and the named cat's breed must also be available. Existing visitors finish their normal stay and remain adoptable across a month boundary; adopted cats stay permanently.
- **appears**: `odds` above 0 and at most 0.25 (0.05 is a rare guest); optional `worlds` list of world ids.

## 2. Write the file

```ts
import { defineCat } from '../types'

export default defineCat({
  id: 'captain-whiskers', name: 'Captain Whiskers',
  genes: { coat: 'smoke', eyes: 'odd', personality: 'lazy', marking: 'mask', silhouette: 'fold' },
  bio: "Retired ship's cat. Has opinions about tuna.",
  catchphrase: 'Arr, feed me.',
  appears: { odds: 0.05 },
})
```

## 3. Register, look, test

```bash
node tools/build-content.mjs
node tools/preview.mjs cat <id> --out <scratch>   # the cat's 4x portrait in every flavor
```

Open the PNG and check the look matches the description. Then the checks from `AGENTS.md` (`Codex plugin validate .`, both `tsc` runs, `Codex plugin test .`, `node --test server/arcade.test.mjs`, `node tools/build-content.mjs --check`) and `node tools/build-web.mjs`. `hooks/content/cats.test.ts` validates every named cat against the coat and world registries. Sample each eligible world at a fixed in-season date, prove exclusion elsewhere and outside its window, and prevent duplicate household/visitor names.

## 4. Commit

`feat(cats): add <name>`.
