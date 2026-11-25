import { tryAddCivilDays } from '../dates'
import { daysBetweenCivilDates, getPeriodDuration } from '../periods'
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

function dateRange(startDate: CivilDate | null, endDate: CivilDate | null): CivilDateRange | null {
  return startDate && endDate && startDate <= endDate ? { startDate, endDate } : null
}

function medianRounded(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle]
    : sorted[middle - 1] + Math.ceil((sorted[middle] - sorted[middle - 1]) / 2)
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
  const duration = getPeriodDuration(lastPeriod)
  const centralCycleLength = daysBetweenCivilDates(lastPeriod.startDate, estimate.predictedStartDate)
  if (duration > centralCycleLength) return null

  const recentDurations = recordedPeriods.slice(-6).map(getPeriodDuration)
  const predictedPeriodDuration = medianRounded(recentDurations)
  const earliestNextStart =
    estimate.kind === 'range'
      ? estimate.earliestStartDate
      : tryAddCivilDays(estimate.predictedStartDate, -estimate.uncertaintyDays)
  const latestNextStart =
    estimate.kind === 'range'
      ? estimate.latestStartDate
      : tryAddCivilDays(estimate.predictedStartDate, estimate.uncertaintyDays)

  // The central ovulation marker uses the conventional 14-day luteal estimate.
  // The lighter range combines the cycle-start spread with a 10–16 day luteal span.
  const follicularStart = tryAddCivilDays(lastPeriod.startDate, duration)
  const expectedOvulation = tryAddCivilDays(estimate.predictedStartDate, -14)
  const coherentOvulation = follicularStart && expectedOvulation && expectedOvulation > follicularStart
  const earliestOvulation = earliestNextStart && tryAddCivilDays(earliestNextStart, -16)
  const latestPossibleOvulation = latestNextStart && tryAddCivilDays(latestNextStart, -10)
  const firstOvulation = follicularStart && tryAddCivilDays(follicularStart, 1)
  const earliestPossibleOvulation =
    earliestOvulation && firstOvulation
      ? earliestOvulation < firstOvulation
        ? firstOvulation
        : earliestOvulation
      : null
  const coherentPossibleOvulation =
    coherentOvulation &&
    earliestPossibleOvulation &&
    latestPossibleOvulation &&
    earliestPossibleOvulation <= latestPossibleOvulation
  const coherentPossibleStart = earliestNextStart && follicularStart && earliestNextStart >= follicularStart

  return {
    menstrual: {
      expected: dateRange(
        estimate.predictedStartDate,
        tryAddCivilDays(estimate.predictedStartDate, predictedPeriodDuration - 1),
      ),
      possible:
        coherentPossibleStart && latestNextStart
          ? dateRange(earliestNextStart, tryAddCivilDays(latestNextStart, predictedPeriodDuration - 1))
          : null,
    },
    follicular: {
      expected: coherentOvulation ? dateRange(follicularStart, tryAddCivilDays(expectedOvulation, -1)) : null,
      possible: coherentPossibleOvulation
        ? dateRange(follicularStart, tryAddCivilDays(latestPossibleOvulation, -1))
        : null,
    },
    ovulatory: {
      expected: coherentOvulation ? dateRange(expectedOvulation, expectedOvulation) : null,
      possible: coherentPossibleOvulation ? dateRange(earliestPossibleOvulation, latestPossibleOvulation) : null,
    },
    luteal: {
      expected: coherentOvulation
        ? dateRange(tryAddCivilDays(expectedOvulation, 1), tryAddCivilDays(estimate.predictedStartDate, -1))
        : null,
      possible:
        coherentPossibleOvulation && latestNextStart
          ? dateRange(tryAddCivilDays(earliestPossibleOvulation, 1), tryAddCivilDays(latestNextStart, -1))
          : null,
    },
  }
}
