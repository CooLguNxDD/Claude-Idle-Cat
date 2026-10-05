---
name: expedition-event-gen
description: Add a trail event (an animated expedition beat such as a treasure chest, a fight, a rest or an obstacle) to Claude Idle Cat, and wire it into an expedition's flow. Use when asked for expedition events, trail animations, enemies, bosses or expedition flows.
---

# expedition-event-gen

Trail events are what the Expedition tab plays while a party is out. They are **cosmetic**. `hooks/trail.ts` builds each run's beats from `run.seed`, `startAt` and `endsAt`, and deals out the loot frozen at departure across the finding beats. Never make an event change loot, XP, bond, cost or duration.

## 1. Pin down the fields

One file per event: `hooks/content/trail-events/<id>.ts`. Choose a unique lowercase kebab-case id, and keep ids that saves or flows already use. Read `TrailEvent`, `TRAIL_KINDS`, `TRAIL_PROPS`, `trailEventProblems()` and `flowProblems()` in `hooks/content/progression.ts`.

| kind | plays | suggested moves | prop |
|---|---|---|---|
| `walk` | the party trots and the ground scrolls | `trot`, `walk`, `zoomies` | none |
| `forage` | sniff and dig; a find pops out | `prowl` → `knead` | `bush`, `mushroom`, `fish` |
| `treasure` | sneak up; the chest opens with sparkles | `sneak-attack` → `celebrate` | `chest`, `pumpkin` |
| `fight` | hiss, pounce; the foe poofs | `hiss` → `pounce` | `rat`, `crab`, `owl`, `pigeon`, `crow`, `snowball`, `bee` |
| `boss` | a longer fight with an HP bar, at about 80% of the trail | `hiss` → `zoomies` → `celebrate` | `raccoon`, `drone`, `ghost` |
| `rest` | the party loafs and naps; a z drifts up | `loaf` → `nap-curl` | `campfire` |
| `obstacle` | crouch and hop over or past it | `prowl` → `hop` / `tunnel-dash` | `log`, `stream`, `ice`, `gap`, `meteor` |
| `discover` | an `!` pops up, then a find | `sit` → `groom` / `pounce` | `signpost`, `butterfly` |
| `meet` | a friend appears; a heart pops up | `sit` → `hop` | `stray`, `alien` |
| `return` | the last beat: the party carries the sack home | `trot` | `sack` |

- `moves`: one to three ids from `hooks/content/moves/`. They play in order across the action window of each loop: walk in to 30%, act to 85%, then the outcome.
- `seconds`: the loop length, 4–30.
- `weight`: 0–10. It is the chance of being picked among a flow's middle beats; 0 keeps an event out of random picks.
- `prop`: required for every kind except `walk` and `return`.
- `trails`: optional expedition ids that may draw the event when they have no flow.
- `line`: at most 40 characters. `{cat}` becomes the lead cat's name. The scene truncates the line to the pane width.

Stop and ask before adding a new kind, prop, backdrop or pose. A new prop needs:
- its id in `TRAIL_PROPS`;
- a `case` in `drawProp` in `hooks/scene/trail.ts`, drawn with the design-grid pen (4 units per scene pixel, ground at `FLOOR`, left edge at `x`), using theme tokens only;
- an entry in `FOES` if it should poof when beaten.

## 2. Write from this canonical example

```ts
import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'crab-pinch', label: 'Crab pinch', kind: 'fight', moves: ['hiss', 'pounce'], prop: 'crab',
  seconds: 8, weight: 2, trails: ['riverbank'], line: 'A crab pinches! {cat} bops it',
})
```

## 3. Wire the flow

An expedition's optional `flow` decides what its trail plays:

```ts
flow: { events: ['stroll', 'crab-pinch', 'stream-hop', 'treasure-chest', 'head-home'], boss: 'big-raccoon', backdrop: 'river' },
```

- `events`: the pool for the middle beats. Include at least one `walk`, one finding kind (`forage`, `treasure` or `discover`) and one `return`; the trail falls back to `head-home` otherwise. Never list a boss here.
- `boss`: optional, and must be a `boss` event. It is inserted at about 80% when the trail has three or more beats.
- `backdrop`: one of `TRAIL_BACKDROPS` (garden, river, woods, snow, neon, moon, patch).
- The beat count scales with real minutes (one per ~10 minutes, 2–9) and is followed by the return beat.

## 4. Register, look and test

```bash
node tools/build-content.mjs
node tools/preview.mjs trail-event <id>      # approach, action and outcome in every flavor
node tools/preview.mjs trail <expedition-id> # every beat of a sample run
claude plugin validate .
npx -y -p typescript tsc -p .
claude plugin test .
node tools/build-content.mjs --check
node --test tools/content.test.mjs
```

Look at both previews: the prop must read at the cats' scale, and foes must poof at the outcome. Mirror the complete skill byte-for-byte between `.claude/skills/expedition-event-gen/` and `.agents/skills/expedition-event-gen/`.

## 5. Commit

`feat(expeditions): add the <label> trail event`. Include the passing checks and the preview in the review summary.
