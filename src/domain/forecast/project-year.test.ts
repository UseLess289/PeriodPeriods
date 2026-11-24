import { describe, expect, it } from 'vitest'
import { estimatePhases, projectYear } from './project-year'
import type { Period } from '../periods'

function periods(dates: string[], endDate?: string): Period[] {
  return dates.map((startDate, index) => ({
    id: `${index}`,
    startDate,
    ...(index === dates.length - 1 && endDate ? { endDate } : {}),
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }))
}

describe('conditional one-year projection', () => {
  it('accumulates observed interval bounds without storing projected events', () => {
    const history = periods(['2025-01-01', '2025-01-28', '2025-02-25', '2025-03-26'], '2025-03-30')
    const forecast = projectYear(history, '2025-03-26')

    expect(forecast[0]).toMatchObject({
      index: 1,
      startDate: '2025-04-23',
      earliestStartDate: '2025-04-22',
      latestStartDate: '2025-04-24',
    })
    expect(forecast[1]).toMatchObject({
      index: 2,
      earliestStartDate: '2025-05-19',
      latestStartDate: '2025-05-23',
    })
    expect(history).toHaveLength(4)
    expect(forecast.every((item) => item.startDate <= '2026-03-26')).toBe(true)
    const phases = estimatePhases(forecast[0], history)
    expect(phases.map((phase) => phase.name)).toEqual(['menstruelle', 'folliculaire', 'ovulatoire', 'lutéale'])
    expect(phases[0]).toMatchObject({ startDate: '2025-04-23', endDate: '2025-04-27' })
    expect(phases.slice(1).every((phase) => phase.startDate === null && phase.endDate === null)).toBe(true)
  })

  it('does not infer phases without observed end dates or forecast with too few intervals', () => {
    const history = periods(['2025-01-01', '2025-01-29', '2025-02-26'])
    expect(projectYear(history, '2025-03-01')).toEqual([])
    const enough = periods([...history.map((period) => period.startDate), '2025-03-26'])
    expect(estimatePhases(projectYear(enough, '2025-03-26')[0], enough)).toEqual([])
  })

  it('starts projections at the current horizon even when the last recorded start was long ago', () => {
    const oldHistory = periods(['2010-01-01', '2010-01-29', '2010-02-26', '2010-03-26'])
    const forecast = projectYear(oldHistory, '2025-03-26')
    expect(forecast[0].startDate >= '2025-03-26').toBe(true)
    expect((forecast.at(-1)?.startDate ?? '') <= '2026-03-26').toBe(true)
  })
})
