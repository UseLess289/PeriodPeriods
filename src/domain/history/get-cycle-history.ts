import { assertValidCivilDate, daysBetweenCivilDates } from '../periods'
import type { CivilDate, Period } from '../periods'

type PeriodStart = Pick<Period, 'startDate'>

export type CycleInterval = {
  previousStartDate: CivilDate
  nextStartDate: CivilDate
  durationDays: number
}

export type CycleHistory = {
  intervals: CycleInterval[]
  shortestIntervalDays: number | null
  longestIntervalDays: number | null
}

export function getCycleHistory(periods: readonly PeriodStart[], today: CivilDate): CycleHistory {
  assertValidCivilDate(today, 'today')

  const eligibleStarts = periods
    .map(({ startDate }) => {
      assertValidCivilDate(startDate, 'startDate')
      return startDate
    })
    .filter((startDate) => startDate <= today)
    .sort()

  const intervals = eligibleStarts.slice(1).map((nextStartDate, index) => {
    const previousStartDate = eligibleStarts[index]
    return {
      previousStartDate,
      nextStartDate,
      durationDays: daysBetweenCivilDates(previousStartDate, nextStartDate),
    }
  })

  if (intervals.length === 0) {
    return { intervals, shortestIntervalDays: null, longestIntervalDays: null }
  }

  const durations = intervals.map(({ durationDays }) => durationDays)
  const bounds = durations.reduce(
    (current, duration) => ({
      shortest: Math.min(current.shortest, duration),
      longest: Math.max(current.longest, duration),
    }),
    { shortest: durations[0], longest: durations[0] },
  )

  return {
    intervals,
    shortestIntervalDays: bounds.shortest,
    longestIntervalDays: bounds.longest,
  }
}
