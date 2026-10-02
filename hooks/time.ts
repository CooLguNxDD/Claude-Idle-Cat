const DAY = 86_400_000

// Day number by the local clock, so daily resets happen at your midnight, not UTC's.
export const localDay = (now: number) => Math.floor((now - new Date(now).getTimezoneOffset() * 60_000) / DAY)
