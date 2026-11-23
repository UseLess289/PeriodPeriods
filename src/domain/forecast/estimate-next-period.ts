import { addCivilDays } from '../dates'
import { assertValidCivilDate, daysBetweenCivilDates } from '../periods'
import type { CivilDate, Period } from '../periods'

type PeriodStart = Pick<Period, 'startDate'>

type InsufficientEstimate = {
  kind: 'insufficient'
  cycleCount: number
  requiredCycles: 3
}

type LowConfidenceEstimate = {
  kind: 'low-confidence'
  cycleCount: number
  usedCycles: number
  medianCycleLength: number
  predictedStartDate: CivilDate
  isPast: boolean
}

type RangeEstimate = {
  kind: 'range'
  cycleCount: number
  usedCycles: 6
  medianCycleLength: number
  predictedStartDate: CivilDate
  earliestStartDate: CivilDate
  latestStartDate: CivilDate
  isPast: boolean
}

export type PeriodStartEstimate = InsufficientEstimate | LowConfidenceEstimate | RangeEstimate

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function roundMedianToCivilDays(value: number): number {
  return Math.floor(value + 0.5)
}

export function estimateNextPeriod(periods: readonly PeriodStart[], today: CivilDate): PeriodStartEstimate {
  assertValidCivilDate(today, 'today')

  const eligibleStarts = periods
    .map(({ startDate }) => {
      assertValidCivilDate(startDate, 'startDate')
      return startDate
    })
    .filter((startDate) => startDate <= today)
    .sort()

  const cycleLengths = eligibleStarts
    .slice(1)
    .map((startDate, index) => daysBetweenCivilDates(eligibleStarts[index], startDate))
  const cycleCount = cycleLengths.length

  if (cycleCount < 3) return { kind: 'insufficient', cycleCount, requiredCycles: 3 }

  const recentCycleLengths = cycleCount >= 6 ? cycleLengths.slice(-6) : cycleLengths
  const medianCycleLength = median(recentCycleLengths)
  const lastStart = eligibleStarts.at(-1)!
  const predictedStartDate = addCivilDays(lastStart, roundMedianToCivilDays(medianCycleLength))
  const isPast = predictedStartDate < today

  if (cycleCount < 6) {
    return {
      kind: 'low-confidence',
      cycleCount,
      usedCycles: recentCycleLengths.length,
      medianCycleLength,
      predictedStartDate,
      isPast,
    }
  }

  return {
    kind: 'range',
    cycleCount,
    usedCycles: 6,
    medianCycleLength,
    predictedStartDate,
    earliestStartDate: addCivilDays(lastStart, Math.min(...recentCycleLengths)),
    latestStartDate: addCivilDays(lastStart, Math.max(...recentCycleLengths)),
    isPast,
  }
}
