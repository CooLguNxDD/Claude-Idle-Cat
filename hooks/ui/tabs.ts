import type { View } from '../../types'

export const TABS: { view: View; label: string; hotkey: string }[] = [
  { view: 'cat', label: 'Cat', hotkey: 'c' },
  { view: 'adopt', label: 'Adopt', hotkey: 'a' },
  { view: 'skills', label: 'Skills', hotkey: 's' },
  { view: 'home', label: 'Home', hotkey: 'h' },
  { view: 'expedition', label: 'Expedition', hotkey: 'x' },
  { view: 'friends', label: 'Friends', hotkey: 'r' },
  { view: 'book', label: 'Book', hotkey: 'b' },
  { view: 'miles', label: 'Miles', hotkey: 'm' },
  { view: 'arcade', label: 'Arcade', hotkey: 'g' },
  { view: 'settings', label: 'Settings', hotkey: 'v' },
  { view: 'weather', label: 'Weather', hotkey: 't' },
]

export const adjacentTab = (view: View, step: number): View =>
  TABS[(TABS.findIndex(t => t.view === view) + step + TABS.length) % TABS.length]!.view

/** The Expedition tab reads `Expedition-N` while N parties are out. */
export const tabLabel = (view: View, runs: number) => view === 'expedition' && runs > 0 ? `Expedition-${runs}` : TABS.find(t => t.view === view)?.label ?? view

// Reserve "hotkey: label", gaps, the selected marker, Back and arrows.
export const visibleTabs = (view: View, columns: number, runs = 0) => {
  const tabs = TABS.map(t => ({ ...t, label: tabLabel(t.view, runs), isBusy: t.view === 'expedition' && runs > 0 }))
  const active = Math.max(0, tabs.findIndex(t => t.view === view))
  let first = active
  let last = active
  let used = tabs[active]!.label.length + 14
  const fits = (i: number) => used + tabs[i]!.label.length + 4 <= columns
  while (first > 0 || last < tabs.length - 1) {
    let grew = false
    if (last < tabs.length - 1 && fits(last + 1)) {
      used += tabs[++last]!.label.length + 4
      grew = true
    }
    if (first > 0 && fits(first - 1)) {
      used += tabs[--first]!.label.length + 4
      grew = true
    }
    if (!grew) break
  }
  return tabs.slice(first, last + 1)
}
