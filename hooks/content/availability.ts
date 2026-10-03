import type { Availability } from './types'

// Content follows the same local calendar as birthdays and seasonal yard decor.
export const isContentAvailable = (available: Availability | undefined, now: number): boolean =>
  !available || available.months.includes(new Date(now).getMonth() + 1)
