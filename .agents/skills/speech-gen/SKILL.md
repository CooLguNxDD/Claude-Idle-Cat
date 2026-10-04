---
name: speech-gen
description: Add a cat speech bank to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# speech-gen

## 1. Pin down the fields

One file per bank in `hooks/content/speech/<id>.ts`. Choose a unique lowercase kebab-case id. Read `Speech` and `speechProblems()` in `hooks/content/progression.ts`.

Triggers: `idle`, `plan`, `done`, `bowl.empty`, `wake`, `pair.start`, `pair.end`, `pet`, `play`, `fill`, `gift`, `gift.loved`, `levelup`, `weather`, `festival`, `stray`, `catch`, `welcome`, `claude.prompt`, `claude.tool`, `claude.done`, `claude.error`, `test.pass`, `test.fail`.

Tokens, only these: `{name}` `{buddy}` `{food}` `{gift}` `{tool}` `{weather}` `{bowl}`. `{bowl}` is the placed bowl's name, filled on `done` and `fill`. Lines are 1–60 characters, 1–12 per bank. Weight is 0–10. Hours are two different hours from 0 to 23 and may wrap, as moves do. Glyphs are font-safe: `!` `?` `♥` `z` `*`. `role` is only `lead` or `partner`, and only on `pair.start` or `pair.end`. Optional `when.minBowl` is a whole cap from 4 to 24; the bank is eligible only when the placed bowl's cap is at least that.

`about` ids must exist for `plan` and `done` (behaviors) and for `pair.start` and `pair.end` (interactions). Weather, festival, gift and tool banks use `about` as a filter, not a new engine concept.

Stop and ask if the request needs a new trigger, token, glyph or effect. Existing authorization for an engine change still applies. Do not import `SPEECH` from `hooks/friends.ts`.

## 2. Write from a canonical example per group

```ts
import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-lazy', on: 'idle', when: { personality: ['lazy'], weight: 1 }, glyph: 'z',
  lines: ['Is it nap time? It is always nap time.', 'Five more minutes. Maybe six.'],
})
```

```ts
export default defineSpeech({
  id: 'plan-eat', on: 'plan', about: ['eat-bowl'], when: { weight: 1 }, glyph: '!',
  lines: ['{name} has a plan: eat.', 'Walking to the bowl. Officially.'],
})
```

```ts
export default defineSpeech({
  id: 'pair-start-lead', on: 'pair.start', role: 'lead', when: { weight: 1 }, glyph: '!',
  lines: ['{buddy}, you are it.', 'Pair mode: I lead.'],
})
```

```ts
export default defineSpeech({
  id: 'pet', on: 'pet', when: { weight: 1 }, glyph: '♥',
  lines: ['Purr engine: online.', 'That was the good spot.'],
})
```

```ts
export default defineSpeech({
  id: 'weather-rain', on: 'weather', about: ['rain', 'drizzle', 'storm'], when: { weight: 1 }, glyph: '?',
  lines: ['{weather}. I stay in.', 'Wet paws are a crime.'],
})
```

```ts
export default defineSpeech({
  id: 'claude-tool-bash', on: 'claude.tool', about: ['Bash'], when: { weight: 1 }, glyph: '!',
  lines: ['The terminal clicked. Again.', 'Bash. I heard the terminal clicked.'],
})
```

Personality, moods, `minFriend`, `minBond` and `minBowl` narrow `when`. Pair banks should name `{buddy}`. A fancy-bowl bank can require `minBowl: 14` and say `{bowl}`. Owner and Claude lines stay short enough to read in the pane.

## 3. Register, look and test

```bash
node tools/build-content.mjs
claude plugin validate .
npx -y -p typescript tsc -p .
npx -y -p typescript tsc -p web
claude plugin test .
node --test server/arcade.test.mjs
node tools/build-content.mjs --check
node --test tools/content.test.mjs
```

Speech is not drawn by `tools/preview.mjs`. Add the README row only if the bank is a new user-facing setting or command. Mirror this skill byte-for-byte between `.claude/skills/speech-gen/` and `.agents/skills/speech-gen/`.

## 4. Commit

`feat(speech): add the <label> speech bank`. Include the passing checks in the review summary. Do not rebuild the arcade bundle unless a browser import changed.
