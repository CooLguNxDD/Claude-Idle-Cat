import type { CatCommand, Genes, Home } from '../../types'
import { isAway } from '../away'
import { adoptPrice, newCat } from '../game'
import { rollGenes } from '../genes'
import { maxCats } from '../home'
import { pick } from '../rng'
import type { Rng } from '../rng'

export const BREED_COST = 200
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
  if (home.coins < BREED_COST) return fail(home, `A reroll costs ${BREED_COST}c.`)
  const genes = rollGenes(rng, now)
  return { ...home, coins: home.coins - BREED_COST,
    shelter: { ...home.shelter, pending: { ...pending, genes, openedAt: null } },
    log: `The parcel is closed again. Open it to see ${genes.coat}${genes.isShiny ? ' ✨' : ''}.` }
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
  const price = BREED_COST
  if (home.coins < price) return fail(home, `Rerolling ${cat.name} costs ${price}c.`)
  const after = cosmetic(cat.genes, rng, now)
  return { ...home, coins: home.coins - price,
    shelter: { ...home.shelter, offer: { catId: cat.id, before: cat.genes, after, cost: price, at: now, openedAt: null } },
    log: `${cat.name}'s parcel is waiting. Open it to see the new breed.` }
}

const againBreed = (home: Home, now: number, rng: Rng): Home => {
  const offer = home.shelter.offer
  if (!offer || offer.openedAt === null) return fail(home, 'Open the parcel before rolling again.')
  const cat = home.cats.find(c => c.id === offer.catId)
  if (!cat) return fail(home, 'That cat is not here.')
  const price = BREED_COST
  if (home.coins < price) return fail(home, `Rolling again costs ${price}c.`)
  const after = cosmetic(cat.genes, rng, now)
  return { ...home, coins: home.coins - price,
    shelter: { ...home.shelter, offer: { ...offer, after, cost: price, at: now, openedAt: null } },
    log: `${cat.name}'s parcel is closed again. Open it to see the new breed.` }
}

const openBreed = (home: Home, now: number): Home => {
  const offer = home.shelter.offer
  if (!offer) return fail(home, 'There is no breed parcel to open.')
  if (offer.openedAt !== null) return home
  return { ...home, shelter: { ...home.shelter, offer: { ...offer, openedAt: now } }, log: 'The parcel rustles…' }
}

const rollbackBreed = (home: Home, catId: string): Home => {
  const offer = home.shelter.offer
  if (!offer || offer.catId !== catId) return fail(home, 'There is no breed roll to undo.')
  const cat = home.cats.find(c => c.id === catId)
  return { ...home, shelter: { ...home.shelter, offer: null },
    log: `${cat?.name ?? 'The cat'} keeps the old breed.` }
}

const confirmBreed = (home: Home, catId: string): Home => {
  const offer = home.shelter.offer
  if (!offer || offer.catId !== catId) return fail(home, 'There is no breed roll to confirm.')
  if (offer.openedAt === null) return fail(home, 'Open the parcel first.')
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
    case 'breed.again': return againBreed(home, now, rng)
    case 'breed.open': return openBreed(home, now)
    case 'breed.rollback': return rollbackBreed(home, command.catId)
    case 'breed.confirm': return confirmBreed(home, command.catId)
  }
}
