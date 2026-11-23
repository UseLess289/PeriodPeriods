import { describe, expect, it } from 'vitest'
import { estimateNextPeriod } from './estimate-next-period'

describe('next period estimate', () => {
  it('does not estimate until there are three intervals between recorded starts', () => {
    const estimate = estimateNextPeriod(
      [{ startDate: '2025-01-01' }, { startDate: '2025-01-29' }, { startDate: '2025-02-26' }],
      '2025-03-01',
    )

    expect(estimate).toEqual({ kind: 'insufficient', cycleCount: 2, requiredCycles: 3 })
  })

  it('uses the median of all three to five intervals and marks confidence as low', () => {
    const estimate = estimateNextPeriod(
      [
        { startDate: '2025-01-01' },
        { startDate: '2025-01-29' },
        { startDate: '2025-02-27' },
        { startDate: '2025-03-29' },
        { startDate: '2025-04-29' },
      ],
      '2025-04-29',
    )

    expect(estimate).toEqual({
      kind: 'low-confidence',
      cycleCount: 4,
      usedCycles: 4,
      medianCycleLength: 29.5,
      predictedStartDate: '2025-05-29',
      isPast: false,
    })
  })

  it('uses only the six most recent intervals for the median and historical range', () => {
    const estimate = estimateNextPeriod(
      [
        { startDate: '2025-01-01' },
        { startDate: '2025-03-02' },
        { startDate: '2025-03-30' },
        { startDate: '2025-04-27' },
        { startDate: '2025-05-26' },
        { startDate: '2025-06-25' },
        { startDate: '2025-07-26' },
        { startDate: '2025-08-27' },
      ],
      '2025-08-27',
    )

    expect(estimate).toEqual({
      kind: 'range',
      cycleCount: 7,
      usedCycles: 6,
      medianCycleLength: 29.5,
      predictedStartDate: '2025-09-26',
      earliestStartDate: '2025-09-24',
      latestStartDate: '2025-09-28',
      isPast: false,
    })
  })

  it('ignores future-dated starts when counting intervals', () => {
    const estimate = estimateNextPeriod(
      [
        { startDate: '2025-01-01' },
        { startDate: '2025-01-29' },
        { startDate: '2025-02-26' },
        { startDate: '2025-03-26' },
      ],
      '2025-02-01',
    )

    expect(estimate).toEqual({ kind: 'insufficient', cycleCount: 1, requiredCycles: 3 })
  })

  it('keeps an estimate in the past anchored to the last recorded start', () => {
    const estimate = estimateNextPeriod(
      [
        { startDate: '2025-01-01' },
        { startDate: '2025-01-29' },
        { startDate: '2025-02-26' },
        { startDate: '2025-03-26' },
      ],
      '2025-04-25',
    )

    expect(estimate).toMatchObject({ kind: 'low-confidence', predictedStartDate: '2025-04-23', isPast: true })
  })

  it('projects dates with civil-day arithmetic across daylight-saving transitions', () => {
    const estimate = estimateNextPeriod(
      [
        { startDate: '2024-03-01' },
        { startDate: '2024-03-29' },
        { startDate: '2024-04-26' },
        { startDate: '2024-05-24' },
      ],
      '2024-05-24',
    )

    expect(estimate).toMatchObject({ kind: 'low-confidence', predictedStartDate: '2024-06-21' })
  })
})
