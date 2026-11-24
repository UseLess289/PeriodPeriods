import { describe, expect, it } from 'vitest'
import { backtestForecast } from './backtest'

describe('chronological forecast backtest', () => {
  it('compares each predicted start with a later observed start', () => {
    const starts = [
      '2025-01-01',
      '2025-01-29',
      '2025-02-26',
      '2025-03-26',
      '2025-04-23',
      '2025-05-21',
      '2025-06-18',
      '2025-07-16',
    ]
    const result = backtestForecast(
      starts.map((startDate) => ({ startDate })),
      '2025-07-16',
    )
    expect(result).toEqual({ evaluatedCycles: 4, medianAbsoluteErrorDays: 0, rangeCoverage: 1 })
  })

  it('does not use later dates or estimate from insufficient history', () => {
    const dates = ['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-26', '2025-04-23']
    expect(
      backtestForecast(
        dates.map((startDate) => ({ startDate })),
        '2025-03-26',
      ),
    ).toBeNull()
    expect(
      backtestForecast(
        dates.map((startDate) => ({ startDate })),
        '2025-04-23',
      ),
    ).toMatchObject({
      evaluatedCycles: 1,
      rangeCoverage: null,
    })
  })
})
