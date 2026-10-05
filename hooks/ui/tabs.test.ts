import { expect, test } from 'claude-code/testing'
import { TABS, adjacentTab, tabLabel, visibleTabs } from './tabs'

test('the Expedition tab sits between Home and Friends and counts running parties', () => {
  expect(TABS.map(t => t.view).slice(3, 6)).toEqual(['home', 'expedition', 'friends'])
  expect(adjacentTab('home', 1)).toBe('expedition')
  expect(tabLabel('expedition', 0)).toBe('Expedition')
  expect(tabLabel('expedition', 2)).toBe('Expedition-2')
  expect(tabLabel('friends', 2)).toBe('Friends')
  const busy = visibleTabs('expedition', 200, 1).find(t => t.view === 'expedition')!
  expect(busy.label).toBe('Expedition-1')
  expect(busy.isBusy).toBe(true)
  expect(visibleTabs('expedition', 200, 0).find(t => t.view === 'expedition')!.isBusy).toBe(false)
})
