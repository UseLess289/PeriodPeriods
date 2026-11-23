import { describe, expect, it } from 'vitest'
import { getCycleHistory } from './get-cycle-history'

describe('getCycleHistory', () => {
  it('returns chronological intervals and all-history bounds, excluding future starts', () => {
    const history = getCycleHistory(
      [
        { startDate: '2025-03-27' },
        { startDate: '2025-01-29' },
        { startDate: '2025-04-24' },
        { startDate: '2025-02-26' },
        { startDate: '2025-01-01' },
      ],
      '2025-03-27',
    )

    expect(history).toEqual({
      intervals: [
        { previousStartDate: '2025-01-01', nextStartDate: '2025-01-29', durationDays: 28 },
        { previousStartDate: '2025-01-29', nextStartDate: '2025-02-26', durationDays: 28 },
        { previousStartDate: '2025-02-26', nextStartDate: '2025-03-27', durationDays: 29 },
      ],
      shortestIntervalDays: 28,
      longestIntervalDays: 29,
    })
  })

  it('returns empty bounds when there are fewer than two eligible starts', () => {
    expect(getCycleHistory([], '2025-03-27')).toEqual({
      intervals: [],
      shortestIntervalDays: null,
      longestIntervalDays: null,
    })
    expect(getCycleHistory([{ startDate: '2025-03-28' }], '2025-03-27')).toEqual({
      intervals: [],
      shortestIntervalDays: null,
      longestIntervalDays: null,
    })
  })

  it('counts civil days across leap day', () => {
    const history = getCycleHistory([{ startDate: '2024-03-01' }, { startDate: '2024-02-28' }], '2024-03-01')

    expect(history.intervals).toEqual([
      { previousStartDate: '2024-02-28', nextStartDate: '2024-03-01', durationDays: 2 },
    ])
  })

  it('keeps descriptive bounds across the full history, not just the six most recent intervals', () => {
    const history = getCycleHistory(
      [
        { startDate: '2024-01-01' },
        { startDate: '2024-02-10' },
        { startDate: '2024-03-09' },
        { startDate: '2024-04-06' },
        { startDate: '2024-05-04' },
        { startDate: '2024-06-01' },
        { startDate: '2024-06-29' },
        { startDate: '2024-07-27' },
      ],
      '2024-07-27',
    )

    expect(history.intervals).toHaveLength(7)
    expect(history.intervals[0].durationDays).toBe(40)
    expect(history.intervals.slice(-6).every(({ durationDays }) => durationDays === 28)).toBe(true)
    expect(history).toMatchObject({ shortestIntervalDays: 28, longestIntervalDays: 40 })
  })
})
