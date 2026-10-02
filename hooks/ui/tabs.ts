import type { View } from '../../types'

export const TABS: { view: View; label: string; hotkey: string }[] = [
  { view: 'cat', label: 'Cat', hotkey: 'c' },
  { view: 'skills', label: 'Skills', hotkey: 's' },
  { view: 'home', label: 'Home', hotkey: 'h' },
  { view: 'friends', label: 'Friends', hotkey: 'r' },
  { view: 'book', label: 'Book', hotkey: 'b' },
  { view: 'miles', label: 'Miles', hotkey: 'm' },
  { view: 'arcade', label: 'Arcade', hotkey: 'g' },
  { view: 'weather', label: 'Weather', hotkey: 't' },
  { view: 'adopt', label: 'Adopt', hotkey: 'a' },
]

export const adjacentTab = (view: View, step: number): View =>
  TABS[(TABS.findIndex(t => t.view === view) + step + TABS.length) % TABS.length]!.view

// Reserve "hotkey: label", gaps, the selected marker, Back and arrows.
export const visibleTabs = (view: View, columns: number) => {
  const active = Math.max(0, TABS.findIndex(t => t.view === view))
  let first = active
  let last = active
  let used = TABS[active]!.label.length + 14
  const fits = (i: number) => used + TABS[i]!.label.length + 4 <= columns
  while (first > 0 || last < TABS.length - 1) {
    let grew = false
    if (last < TABS.length - 1 && fits(last + 1)) {
      used += TABS[++last]!.label.length + 4
      grew = true
    }
    if (first > 0 && fits(first - 1)) {
      used += TABS[--first]!.label.length + 4
      grew = true
    }
    if (!grew) break
  }
  return TABS.slice(first, last + 1)
}
