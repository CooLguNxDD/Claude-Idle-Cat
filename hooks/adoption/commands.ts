import type { CatCommand, Genes, Home } from '../../types'
import { isAway } from '../away'
import { adoptPrice, newCat } from '../game'
import { rollGenes } from '../genes'
import { maxCats } from '../home'
import { pick } from '../rng'
import type { Rng } from '../rng'

export const REROLL_COST = 50
const NAMES = ['Tofu', 'Miso', 'Sushi', 'Nori', 'Biscuit', 'Pudding', 'Luna', 'Pixel', 'Bean', 'Taro', 'Boba',
  'Ziggy', 'Kiwi', 'Waffles', 'Socks', 'Pepper', 'Mango', 'Dumpling']

const fail = (home: Home, log: string): Home => ({ ...home, log })
const held = (home: Home) => home.cats.length + (home.shelter.pending ? 1 : 0)
const named = (home: Home, preferred: string | undefined, rng: Rng) => {
  const clean = preferred?.trim().slice(0, 20)
  if (clean) return clean
  const taken = new Set(home.cats.map(c => c.name))
  const free = NAMES.filter(n => !taken.has(n))
  return pick(rng, free.length ? free : NAMES)
}
const cosmetic = (genes: Genes, rng: Rng, now: number): Genes => ({ ...rollGenes(rng, now), personality: genes.personality })

const pull = (home: Home, now: number, rng: Rng, name?: string): Home => {
  if (home.shelter.pending) return fail(home, 'Open the parcel you already paid for.')
  if (held(home) >= maxCats(home)) return fail(home, `The house is full (${maxCats(home)} cats).`)
  const price = adoptPrice(home)
  if (home.coins < price) return fail(home, `Adoption costs ${price}c.`)
  const genes = { ...rollGenes(rng, now), ...(home.shinyCharm ? { isShiny: true } : {}) }
  const cat = newCat(`c${home.nextId}`, named(home, name, rng), genes, now)
  return { ...home, coins: home.coins - price, nextId: home.nextId + 1, shinyCharm: false,
    shelter: { ...home.shelter, pending: { id: cat.id, name: cat.name, genes, bornAt: now, cost: price, pulledAt: now, openedAt: null } },
    log: `A parcel is waiting. Open it to meet your cat.` }
}

const openParcel = (home: Home, now: number): Home => {
  const pending = home.shelter.pending
  if (!pending) return fail(home, 'There is no parcel to open.')
  if (pending.openedAt !== null) return home
  return { ...home, shelter: { ...home.shelter, pending: { ...pending, openedAt: now } }, log: 'The parcel rustles…' }
}

const renamePending = (home: Home, name: string): Home => {
  const pending = home.shelter.pending
  const clean = name.trim().slice(0, 20)
  if (!pending) return fail(home, 'There is no parcel to name.')
  if (!clean) return fail(home, 'That name is empty.')
  return { ...home, shelter: { ...home.shelter, pending: { ...pending, name: clean } }, log: `The parcel is labeled ${clean}.` }
}

const rerollPending = (home: Home, now: number, rng: Rng): Home => {
  const pending = home.shelter.pending
  if (!pending) return fail(home, 'There is no parcel to reroll.')
  if (pending.openedAt === null) return fail(home, 'Open the parcel first.')
  if (home.coins < REROLL_COST) return fail(home, `A reroll costs ${REROLL_COST}c.`)
  const genes = rollGenes(rng, now)
  return { ...home, coins: home.coins - REROLL_COST,
    shelter: { ...home.shelter, pending: { ...pending, genes } },
    log: `The parcel shakes again. ${genes.coat}${genes.isShiny ? ' ✨' : ''}.` }
}

const confirmPull = (home: Home, now: number): Home => {
  const pending = home.shelter.pending
  if (!pending) return fail(home, 'There is no parcel to confirm.')
  if (pending.openedAt === null) return fail(home, 'Open the parcel first.')
  if (home.cats.length >= maxCats(home)) return fail(home, `The house is full (${maxCats(home)} cats).`)
  const cat = newCat(pending.id, pending.name, pending.genes, pending.bornAt)
  return { ...home, cats: [...home.cats, cat], activeId: cat.id,
    shelter: { ...home.shelter, pending: null, pulls: home.shelter.pulls + 1, last: { catId: cat.id, at: now, cost: pending.cost } },
    effect: { kind: 'adopt', at: now },
    log: `Welcome home, ${cat.name}!` }
}

const rerollBreed = (home: Home, catId: string, now: number, rng: Rng): Home => {
  if (home.shelter.offer) return fail(home, 'Confirm or roll back the breed you already rolled.')
  const cat = home.cats.find(c => c.id === catId)
  if (!cat) return fail(home, 'That cat is not here.')
  if (isAway(home, cat.id)) return fail(home, `${cat.name} is away on an expedition.`)
  if (home.coins < REROLL_COST) return fail(home, `A breed reroll costs ${REROLL_COST}c.`)
  const after = cosmetic(cat.genes, rng, now)
  return { ...home, coins: home.coins - REROLL_COST,
    shelter: { ...home.shelter, offer: { catId: cat.id, before: cat.genes, after, cost: REROLL_COST, at: now } },
    log: `${cat.name} might become a ${after.coat}. Confirm or roll back.` }
}

const rollbackBreed = (home: Home, catId: string): Home => {
  const offer = home.shelter.offer
  if (!offer || offer.catId !== catId) return fail(home, 'There is no breed roll to undo.')
  const cat = home.cats.find(c => c.id === catId)
  return { ...home, coins: home.coins + offer.cost, shelter: { ...home.shelter, offer: null },
    log: `${cat?.name ?? 'The cat'} keeps the old breed. ${offer.cost}c returned.` }
}

const confirmBreed = (home: Home, catId: string): Home => {
  const offer = home.shelter.offer
  if (!offer || offer.catId !== catId) return fail(home, 'There is no breed roll to confirm.')
  const cat = home.cats.find(c => c.id === catId)
  if (!cat) return { ...home, shelter: { ...home.shelter, offer: null }, log: 'That cat is gone. The roll is discarded.' }
  return { ...home, cats: home.cats.map(c => c.id === catId ? { ...c, genes: offer.after } : c),
    shelter: { ...home.shelter, offer: null }, log: `${cat.name} is now a ${offer.after.coat}.` }
}

export const applyCatCommand = (home: Home, command: CatCommand, now: number, rng: Rng = Math.random): Home => {
  switch (command.type) {
    case 'shelter.pull': return pull(home, now, rng, command.name)
    case 'shelter.open': return openParcel(home, now)
    case 'shelter.rename': return renamePending(home, command.name)
    case 'shelter.reroll': return rerollPending(home, now, rng)
    case 'shelter.confirm': return confirmPull(home, now)
    case 'breed.reroll': return rerollBreed(home, command.catId, now, rng)
    case 'breed.rollback': return rollbackBreed(home, command.catId)
    case 'breed.confirm': return confirmBreed(home, command.catId)
  }
}
