import { addCivilDays } from '../dates'
import { getPeriodDuration } from '../periods'
import type { CivilDate, Period } from '../periods'
import type { PeriodStartEstimate } from './estimate-next-period'

export const cyclePhaseNames = ['menstrual', 'follicular', 'ovulatory', 'luteal'] as const
export type CyclePhaseName = (typeof cyclePhaseNames)[number]

export type CivilDateRange = {
  startDate: CivilDate
  endDate: CivilDate
}

export type CyclePhaseRanges = Record<
  CyclePhaseName,
  {
    expected: CivilDateRange | null
    possible: CivilDateRange | null
  }
>

function dateRange(startDate: CivilDate, endDate: CivilDate): CivilDateRange | null {
  return startDate <= endDate ? { startDate, endDate } : null
}

function medianRounded(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  return Math.floor(median + 0.5)
}

export function estimateCyclePhaseRanges(
  periods: readonly Period[],
  estimate: Exclude<PeriodStartEstimate, { kind: 'insufficient' }>,
  today: CivilDate,
): CyclePhaseRanges | null {
  const recordedPeriods = periods
    .filter((period) => period.startDate <= today)
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
  const lastPeriod = recordedPeriods.at(-1)
  if (!lastPeriod) return null

  const recentDurations = recordedPeriods.slice(-6).map(getPeriodDuration)
  const predictedPeriodDuration = medianRounded(recentDurations)
  const earliestNextStart =
    estimate.kind === 'range'
      ? estimate.earliestStartDate
      : addCivilDays(estimate.predictedStartDate, -estimate.uncertaintyDays)
  const latestNextStart =
    estimate.kind === 'range'
      ? estimate.latestStartDate
      : addCivilDays(estimate.predictedStartDate, estimate.uncertaintyDays)

  // The central ovulation marker uses the conventional 14-day luteal estimate.
  // The lighter range combines the cycle-start spread with a 10–16 day luteal span.
  const expectedOvulation = addCivilDays(estimate.predictedStartDate, -14)
  const earliestPossibleOvulation = addCivilDays(earliestNextStart, -16)
  const latestPossibleOvulation = addCivilDays(latestNextStart, -10)
  const lastRecordedBleedEnd = addCivilDays(lastPeriod.startDate, getPeriodDuration(lastPeriod) - 1)
  const follicularStart = addCivilDays(lastRecordedBleedEnd, 1)

  return {
    menstrual: {
      expected: dateRange(
        estimate.predictedStartDate,
        addCivilDays(estimate.predictedStartDate, predictedPeriodDuration - 1),
      ),
      possible: dateRange(earliestNextStart, addCivilDays(latestNextStart, predictedPeriodDuration - 1)),
    },
    follicular: {
      expected: dateRange(follicularStart, addCivilDays(expectedOvulation, -1)),
      possible: dateRange(follicularStart, addCivilDays(latestPossibleOvulation, -1)),
    },
    ovulatory: {
      expected: dateRange(expectedOvulation, expectedOvulation),
      possible: dateRange(earliestPossibleOvulation, latestPossibleOvulation),
    },
    luteal: {
      expected: dateRange(addCivilDays(expectedOvulation, 1), addCivilDays(estimate.predictedStartDate, -1)),
      possible: dateRange(addCivilDays(earliestPossibleOvulation, 1), addCivilDays(latestNextStart, -1)),
    },
  }
}
