---
name: breed-gen
description: Add a new cat breed (a coat with its colours, pattern and rarity) to Codex Idle Cat as one data file. Use when asked for a new breed, coat, fur colour or cat pattern, including "cat bleed".
---

# breed-gen: add a breed (coat)

A breed is one file in `hooks/content/breeds/<id>.ts`. The registry, shelter pool, painter (`hooks/genes/paint.ts`), 4x portrait and browser arcade all read it, so a new file is the whole change. The coat id is stored in saves: never rename or delete an existing breed file.

## 1. Pin down the breed

- **id**: lowercase kebab-case, unique. **label**: what the shelter shows.
- **rarity**: `common` `uncommon` `rare` `epic` `legendary`. Rarity is appearance only; it never changes stats.
- **availability**: omit for a year-round coat, or use `available: { months: [10] }` for October. Month lists must be nonempty integers from 1 to 12, evaluated against the local clock. Always keep a year-round coat in each rarity tier. `rollCoat(rng, now)` and `rollGenes(rng, now)` filter new arrivals; existing cats and imports retain their coat outside the window. Full palette requires only year-round coats, but the book records seasonal coats too. Update shelter and book availability labels when adding another seasonal window.
- **colours in words**, then map them to shades.
- **pattern**: one of the kinds in `Pattern`:
  - `solid`: plain fur.
  - `stripes`: tabby bars on the lower body.
  - `rosettes`: bengal-style spots.
  - `points`: dark ears, face, paws and tail (siamese).
  - `bib`: belly-coloured chest (tuxedo).
  - `undercoat` with `blend`: belly colour fading up from below (smoke).
  - `patches` with two `colors`: calico-style patches.
  - `stars` with a `star` shade: speckles over a fur-to-dark sweep (nebula).

  A pattern that isn't listed is a code change in `genes/paint.ts` and `scene/hicat.ts`; ask first.

## 2. Write the file

```ts
import { defineBreed } from '../types'

export default defineBreed({
  id: 'russian-blue', label: 'Russian Blue', rarity: 'rare',
  fur: { mix: ['overlay1', 'blue', 0.3] }, dark: { mix: ['overlay0', 'blue', 0.35] }, belly: { mix: ['overlay2', 'lavender', 0.3] },
  pattern: { kind: 'solid' },
})
```

Shades are a Catppuccin token (`rosewater flamingo pink mauve red maroon peach yellow green teal sky sapphire blue lavender text subtext1 subtext0 overlay2 overlay1 overlay0 surface2 surface1 surface0 base mantle crust`), `light` (white fur in either theme), `ink` (near-black outline colour), or `{ mix: [a, b, t] }`. Never a hex value. `breedProblems` checks every shade.

## 3. Register, look, test

```bash
node tools/build-content.mjs                        # appends; existing coats keep their place, so old seeded rolls stay stable
node tools/preview.mjs breed <id> --out <scratch>   # rows: latte, frappe, macchiato, mocha; columns: markings x silhouettes
node tools/build-web.mjs                            # the arcade draws coats too; commit server/public/arcade.js
```

Open the PNG. The coat must read against both the light latte row and the dark mocha row, and markings (socks, blaze, mask, spots) must still show. Adjust shades and re-render until it does.

Then the checks from `AGENTS.md`. `breeds.test.ts` validates every breed and keeps the 18 original coats first. Seasonal RNG tests must use a fixed timestamp inside the availability window; also prove exclusion outside it and retention in backups. Adding a breed to a rarity tier changes which coat a given seed rolls in that tier; if a test pinned a specific seeded coat, update that expectation and say so.

Update the README coat count ("one of N coats") if it names one.

## 4. Commit

`feat(genes): add the <label> breed`.
