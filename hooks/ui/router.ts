import type { Route, View } from '../../types'
import { adjacentTab } from './tabs'

export const initialRoute = (): Route => ({ view: 'cat', history: [] })
export const navigate = (route: Route, target: View | number): Route => {
  const view = typeof target === 'number' ? adjacentTab(route.view, target) : target
  return view === route.view ? route : { view, history: [...route.history, route.view].slice(-32) }
}
export const goBack = (route: Route): Route => route.history.length
  ? { view: route.history.at(-1)!, history: route.history.slice(0, -1) } : route
