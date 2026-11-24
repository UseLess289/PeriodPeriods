import { daysBetweenCivilDates } from '../periods'
import type { CivilDate, Period } from '../periods'
import { estimateNextPeriod } from './estimate-next-period'

export type ForecastBacktest = {
  evaluatedCycles: number
  medianAbsoluteErrorDays: number
  rangeCoverage: number | null
}

export function backtestForecast(
  periods: readonly Pick<Period, 'startDate'>[],
  today: CivilDate,
): ForecastBacktest | null {
  const starts = periods
    .map((period) => period.startDate)
    .filter((date) => date <= today)
    .sort()
  const errors: number[] = []
  let covered = 0
  let ranged = 0

  for (let index = 4; index < starts.length; index += 1) {
    const training = starts.slice(0, index).map((startDate) => ({ startDate }))
    const estimate = estimateNextPeriod(training, starts[index - 1])
    if (estimate.kind === 'insufficient') continue
    const actual = starts[index]
    errors.push(Math.abs(daysBetweenCivilDates(estimate.predictedStartDate, actual)))
    if (estimate.kind === 'range') {
      ranged++
      if (actual >= estimate.earliestStartDate && actual <= estimate.latestStartDate) covered++
    }
  }
  if (errors.length === 0) return null
  errors.sort((left, right) => left - right)
  const middle = Math.floor(errors.length / 2)
  return {
    evaluatedCycles: errors.length,
    medianAbsoluteErrorDays: errors.length % 2 ? errors[middle] : (errors[middle - 1] + errors[middle]) / 2,
    rangeCoverage: ranged ? covered / ranged : null,
  }
}
