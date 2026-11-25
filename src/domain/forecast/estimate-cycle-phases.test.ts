import { describe, expect, it } from 'vitest'
import type { Period } from '../periods'
import { estimateNextPeriod } from './estimate-next-period'
import { estimateCyclePhaseRanges } from './estimate-cycle-phases'

function recordedPeriods(starts: string[], durations: number[] = []): Period[] {
  return starts.map((startDate, index) => ({
    id: `${index}`,
    startDate,
    durationDays: durations[index] ?? 5,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }))
}

describe('calendar phase ranges', () => {
  it('builds a central cycle and a wider ovulation range from low-confidence cycle history', () => {
    const periods = recordedPeriods(['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-26'])
    const estimate = estimateNextPeriod(periods, '2025-03-26')
    expect(estimate.kind).toBe('low-confidence')
    if (estimate.kind === 'insufficient') throw new Error('Expected a cycle estimate')

    const phases = estimateCyclePhaseRanges(periods, estimate, '2025-03-26')

    expect(phases).toMatchObject({
      menstrual: {
        expected: { startDate: '2025-04-23', endDate: '2025-04-27' },
        possible: { startDate: '2025-04-23', endDate: '2025-04-27' },
      },
      follicular: {
        expected: { startDate: '2025-03-31', endDate: '2025-04-08' },
        possible: { startDate: '2025-03-31', endDate: '2025-04-12' },
      },
      ovulatory: {
        expected: { startDate: '2025-04-09', endDate: '2025-04-09' },
        possible: { startDate: '2025-04-07', endDate: '2025-04-13' },
      },
      luteal: {
        expected: { startDate: '2025-04-10', endDate: '2025-04-22' },
        possible: { startDate: '2025-04-08', endDate: '2025-04-22' },
      },
    })
  })

  it('uses the recent median period duration and recent cycle-start range', () => {
    const periods = recordedPeriods(
      ['2025-01-01', '2025-01-29', '2025-02-27', '2025-03-26', '2025-04-23', '2025-05-22', '2025-06-19'],
      [2, 3, 4, 5, 6, 7, 12],
    )
    const estimate = estimateNextPeriod(periods, '2025-06-19')
    expect(estimate.kind).toBe('range')
    if (estimate.kind !== 'range') throw new Error('Expected a cycle-start range')

    const phases = estimateCyclePhaseRanges(periods, estimate, '2025-06-19')

    expect(phases?.menstrual).toEqual({
      expected: { startDate: '2025-07-17', endDate: '2025-07-22' },
      possible: { startDate: '2025-07-16', endDate: '2025-07-23' },
    })
    expect(phases?.ovulatory).toEqual({
      expected: { startDate: '2025-07-03', endDate: '2025-07-03' },
      possible: { startDate: '2025-06-30', endDate: '2025-07-08' },
    })
  })

  it('ignores future-recorded periods when choosing the last period and duration median', () => {
    const periods = recordedPeriods(
      ['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-26', '2025-04-23'],
      [2, 3, 4, 6, 14],
    )
    const estimate = estimateNextPeriod(periods, '2025-03-26')
    if (estimate.kind === 'insufficient') throw new Error('Expected a cycle estimate')

    const phases = estimateCyclePhaseRanges(periods, estimate, '2025-03-26')

    expect(phases?.menstrual.expected).toEqual({ startDate: '2025-04-23', endDate: '2025-04-26' })
    expect(phases?.follicular.expected?.startDate).toBe('2025-04-01')
  })

  it('returns no predicted phases without a recorded past period', () => {
    const periods = recordedPeriods(['2025-04-23'])
    const estimate = {
      kind: 'low-confidence' as const,
      cycleCount: 3,
      usedCycles: 3,
      medianCycleLength: 28,
      uncertaintyDays: 2,
      predictedStartDate: '2025-04-23',
      isPast: false,
    }

    expect(estimateCyclePhaseRanges(periods, estimate, '2025-03-26')).toBeNull()
  })
})
