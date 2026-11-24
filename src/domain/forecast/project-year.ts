import { addCivilDays } from '../dates'
import { daysBetweenCivilDates, getPeriodDuration } from '../periods'
import type { CivilDate, Period } from '../periods'
import { estimateNextPeriod } from './estimate-next-period'

export type ProjectedCycle = {
  index: number
  startDate: CivilDate
  earliestStartDate: CivilDate
  latestStartDate: CivilDate
  cycleLengthDays: number
}

export type EstimatedPhase = {
  name: 'menstruelle' | 'folliculaire' | 'ovulatoire' | 'lutéale'
  startDate: CivilDate | null
  endDate: CivilDate | null
}

export function projectYear(periods: readonly Period[], today: CivilDate): ProjectedCycle[] {
  const estimate = estimateNextPeriod(periods, today)
  if (estimate.kind === 'insufficient') return []

  const observed = periods
    .map((period) => period.startDate)
    .filter((date) => date <= today)
    .sort()
  const cycleLengths = observed.slice(1).map((date, index) => daysBetweenCivilDates(observed[index], date))
  const recent = cycleLengths.slice(-Math.min(6, cycleLengths.length))
  const shortest = Math.min(...recent)
  const longest = Math.max(...recent)
  const step = Math.floor(estimate.medianCycleLength + 0.5)
  const horizon = addCivilDays(today, 365)
  const lastStart = observed.at(-1)
  if (!lastStart) return []

  const projections: ProjectedCycle[] = []
  const firstIndex = Math.max(1, Math.ceil(daysBetweenCivilDates(lastStart, today) / step))
  // The range accumulates interval uncertainty: it is a conditional scenario,
  // not a confidence interval or a probability statement.
  for (let index = firstIndex; ; index += 1) {
    const startDate = addCivilDays(lastStart, index * step)
    if (startDate > horizon) break
    projections.push({
      index,
      startDate,
      earliestStartDate: addCivilDays(lastStart, index * shortest),
      latestStartDate: addCivilDays(lastStart, index * longest),
      cycleLengthDays: step,
    })
  }
  return projections
}

export function estimatePhases(cycle: ProjectedCycle, periods: readonly Period[]): EstimatedPhase[] {
  const durations = periods
    .filter((period) => period.durationDays !== undefined || (period.endDate && period.endDate >= period.startDate))
    .map(getPeriodDuration)
  if (durations.length === 0) return []

  const sorted = durations.sort((left, right) => left - right)
  const length = Math.max(1, Math.round(sorted[Math.floor(sorted.length / 2)]))
  if (length >= cycle.cycleLengthDays) return []
  // Only the expected bleed length has been observed in prior cycles.
  // Calendar dates alone cannot locate ovulation or the follicular/luteal boundary.
  return [
    { name: 'menstruelle', startDate: cycle.startDate, endDate: addCivilDays(cycle.startDate, length - 1) },
    { name: 'folliculaire', startDate: null, endDate: null },
    { name: 'ovulatoire', startDate: null, endDate: null },
    { name: 'lutéale', startDate: null, endDate: null },
  ]
}
