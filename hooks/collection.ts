import type { Book, Home, Miles } from '../types'
import { CRITTERS } from './critters'
import { dayOf, hasPhoto, friendLevel, PHOTO_LEVEL } from './friends'
import { furniture, place, tierOf } from './home'
import { seeded } from './rng'
import { formOf } from './skills'

export const EMPTY_BOOK: Book = { coats: [], forms: [], shinies: [], visitors: [], photos: [] }
export const EMPTY_MILES: Miles = { total: 0, day: 0, counts: {}, done: [] }

const add = <T>(list: T[], items: T[]) => {
  const fresh = items.filter(i => !list.includes(i))
  return fresh.length ? [...list, ...fresh] : list
}

// Records every coat, form, shiny, stray and photo the household has seen.
export const record = (home: Home): Home => {
  const b = home.book
  const all = [...home.cats, ...home.visitors]
  const book: Book = {
    coats: add(b.coats, all.map(c => c.genes.coat)),
    forms: add(b.forms, home.cats.map(formOf).filter((f): f is NonNullable<typeof f> => f !== null)),
    shinies: add(b.shinies, all.filter(c => c.genes.isShiny).map(c => c.name)),
    visitors: add(b.visitors, home.visitors.map(v => v.name)),
    photos: add(b.photos, home.cats.filter(hasPhoto).map(c => c.name)),
  }
  const same = (Object.keys(book) as (keyof Book)[]).every(k => book[k] === b[k])
  return same ? home : { ...home, book }
}

export type Counter = 'pet' | 'feed' | 'play' | 'gift' | 'buy' | 'tools' | 'turns' | 'donate' | 'visitor' | 'catch' | 'games'
export type Task = { id: string; text: string; counter: Counter; goal: number; miles: number }
const TASKS: readonly Task[] = [
  { id: 'pet3', text: 'Pet a cat 3 times', counter: 'pet', goal: 3, miles: 50 },
  { id: 'feed2', text: 'Feed 2 fish', counter: 'feed', goal: 2, miles: 50 },
  { id: 'play3', text: 'Play 3 times', counter: 'play', goal: 3, miles: 60 },
  { id: 'gift1', text: 'Give a gift', counter: 'gift', goal: 1, miles: 80 },
  { id: 'buy1', text: "Buy something at Nyan's", counter: 'buy', goal: 1, miles: 80 },
  { id: 'tools10', text: 'Claude runs 10 tools', counter: 'tools', goal: 10, miles: 60 },
  { id: 'tools40', text: 'Claude runs 40 tools', counter: 'tools', goal: 40, miles: 120 },
  { id: 'turns3', text: 'Claude finishes 3 replies', counter: 'turns', goal: 3, miles: 60 },
  { id: 'donate1', text: 'Donate to the museum', counter: 'donate', goal: 1, miles: 100 },
  { id: 'visitor1', text: 'Get a visit from a stray', counter: 'visitor', goal: 1, miles: 100 },
  { id: 'catch2', text: 'Cats bring home 2 critters', counter: 'catch', goal: 2, miles: 80 },
  { id: 'games2', text: 'Play 2 arcade rounds', counter: 'games', goal: 2, miles: 80 },
]
export const TASKS_PER_DAY = 5

// Today's tasks, the same all day.
export const tasksFor = (now: number): Task[] => {
  const rng = seeded(dayOf(now) * 31 + 7)
  const pool = [...TASKS]
  const picked: Task[] = []
  while (picked.length < TASKS_PER_DAY && pool.length) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!)
  return picked
}

const today = (miles: Miles, now: number): Miles =>
  miles.day === dayOf(now) ? miles : { ...miles, day: dayOf(now), counts: {}, done: [] }

// Counts an action toward today's tasks and pays out each task once.
export const track = (home: Home, counter: Counter, n: number, now: number): Home => {
  const m = today(home.miles, now)
  const counts = { ...m.counts, [counter]: (m.counts[counter] ?? 0) + n }
  let { total } = m
  const done = [...m.done]
  for (const task of tasksFor(now)) {
    if (task.counter === counter && !done.includes(task.id) && (counts[counter] ?? 0) >= task.goal) {
      done.push(task.id)
      total += task.miles
    }
  }
  return { ...home, miles: { ...m, counts, done, total } }
}

export type Achievement = { id: string; name: string; text: string; miles: number; test: (h: Home) => boolean }
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'family', name: 'Family', text: 'Have 2 cats', miles: 100, test: h => h.cats.length >= 2 },
  { id: 'fullhouse', name: 'Full house', text: 'Have 4 cats', miles: 400, test: h => h.cats.length >= 4 },
  { id: 'lv5', name: 'Growing up', text: 'Reach level 5', miles: 100, test: h => h.cats.some(c => c.level >= 5) },
  { id: 'evolved', name: 'Evolution', text: 'Evolve a cat', miles: 300, test: h => h.book.forms.length > 0 },
  { id: 'allforms', name: 'Shapeshifter', text: 'See all 4 forms', miles: 1000, test: h => h.book.forms.length >= 4 },
  { id: 'shiny', name: 'Sparkle', text: 'Meet a shiny cat', miles: 500, test: h => h.book.shinies.length > 0 },
  { id: 'coats5', name: 'Coat curious', text: 'See 5 coats', miles: 200, test: h => h.book.coats.length >= 5 },
  { id: 'coats9', name: 'Coat collector', text: 'See all 9 coats', miles: 800, test: h => h.book.coats.length >= 9 },
  { id: 'museum5', name: 'Curator', text: 'Donate 5 critters', miles: 200, test: h => h.museum.length >= 5 },
  { id: 'museumall', name: 'Blathers would be proud', text: 'Complete the museum', miles: 2000,
    test: h => h.museum.length >= CRITTERS.length },
  { id: 'friend', name: 'Best friends', text: `Reach friendship level ${PHOTO_LEVEL}`, miles: 600,
    test: h => h.cats.some(c => friendLevel(c.friendship) >= PHOTO_LEVEL) },
  { id: 'strays10', name: 'Popular yard', text: 'Meet 10 strays', miles: 300, test: h => h.book.visitors.length >= 10 },
  { id: 'decorator', name: 'Decorator', text: 'Fill every decor spot of a Manor', miles: 500,
    test: h => h.tier >= 2 && tierOf(h).slots.every(s => h.decor[s]) },
  { id: 'debtfree', name: 'Debt free', text: 'Pay off a Tom Mew loan', miles: 300, test: h => h.tier >= 1 && h.loan === 0 },
  { id: 'streak7', name: 'Regular', text: 'Visit 7 days in a row', miles: 400, test: h => h.streak >= 7 },
  { id: 'rich', name: 'Fat stacks', text: 'Hold 5,000 coins', miles: 300, test: h => h.coins >= 5000 },
  { id: 'gold', name: 'Gold medal', text: 'Win a gold medal in the arcade', miles: 300, test: h => h.arcade.golds > 0 },
  { id: 'arcade6', name: 'Arcade regular', text: 'Play all 6 arcade games', miles: 400,
    test: h => Object.keys(h.arcade.best).length >= 6 },
  { id: 'dash1000', name: 'Roof runner', text: 'Score 1,000 in Rooftop Dash', miles: 500, test: h => (h.arcade.best.dash ?? 0) >= 1000 },
]

// Unlocks every achievement whose test now passes, paying its miles once.
export const checkAchievements = (home: Home, now: number): Home => {
  const fresh = ACHIEVEMENTS.filter(a => !(a.id in home.achievements) && a.test(home))
  if (fresh.length === 0) return home
  const achievements = { ...home.achievements }
  for (const a of fresh) achievements[a.id] = now
  const bonus = fresh.reduce((sum, a) => sum + a.miles, 0)
  return { ...home, achievements, miles: { ...home.miles, total: home.miles.total + bonus },
    effect: { kind: 'award', at: now } }
}

export const settle = (home: Home, now: number) => checkAchievements(record(home), now)

export type MilesItem = { id: string; name: string; cost: number; text: string }
export const MILES_SHOP: readonly MilesItem[] = [
  { id: 'goldbowl', name: 'Golden bowl', cost: 800, text: 'bowl: auto-feeds, +50% gifts, strays love it' },
  { id: 'rainbow', name: 'Rainbow rug', cost: 1000, text: 'rug: joy fades 40% slower' },
  { id: 'moonlamp', name: 'Moon lamp', cost: 1200, text: 'hanging: double AFK events' },
  { id: 'charm', name: 'Shiny charm', cost: 1500, text: 'your next shelter adoption is shiny' },
]

export const buyWithMiles = (home: Home, id: string): Home => {
  const item = MILES_SHOP.find(i => i.id === id)
  if (!item) return home
  if (home.miles.total < item.cost) return { ...home, log: `${item.name} costs ${item.cost} miles.` }
  const paid = { ...home, miles: { ...home.miles, total: home.miles.total - item.cost } }
  if (id === 'charm') {
    if (home.shinyCharm) return { ...home, log: 'You already carry a shiny charm.' }
    return { ...paid, shinyCharm: true, log: 'The shiny charm glows. Your next adoption will sparkle.' }
  }
  if (home.owned.includes(id)) return { ...home, log: `You already own the ${item.name}.` }
  const owned = { ...paid, owned: [...home.owned, id], log: `Got the ${item.name}!` }
  const slot = furniture(id)?.slot
  return slot && tierOf(home).slots.includes(slot) ? place(owned, id) : owned
}
