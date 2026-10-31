// A one-message summary of the household for /cat status, readable without the pane.
import type { Home } from '../types'
import { catsAtHome } from './away'
import { bowlOf } from './bowl'
import { readyRuns } from './expeditions'
import { activeCat, moodOf } from './game'
import { fmtCoins } from './home'

export const statusText = (home: Home, now: number): string => {
  const cat = activeCat(home)
  const here = catsAtHome(home).length
  const out = home.expeditions.runs.length, ready = readyRuns(home, now).length
  return [
    `🐱 ${cat.name} Lv${cat.level} · ${moodOf(cat)}`,
    `${fmtCoins(home.coins)} · ${Math.floor(home.miles.total)} miles`,
    `Cats: ${here} home, ${home.cats.length - here} away`,
    `Bowl: ${home.bowl.food}/${bowlOf(home).cap} (${bowlOf(home).name})`,
    out ? `Expeditions: ${out} out, ${ready} ready${ready ? ' — /cat claim' : ''}` : 'Expeditions: none out',
  ].join('\n')
}
