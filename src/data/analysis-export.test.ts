import { describe, expect, it } from 'vitest'
import { serializeAnalysisExport } from './analysis-export'

describe('analysis export', () => {
  it('uses relative days and allowlists structured observations without personal metadata', () => {
    const metadata = { id: 'private-id', createdAt: '2025-01-01T12:00:00.000Z', updatedAt: '2025-01-02T12:00:00.000Z' }
    const output = serializeAnalysisExport(
      [
        {
          ...metadata,
          startDate: '2025-02-02',
          durationDays: 4,
          dailyLogs: [{ day: 1 }, { day: 2, flow: 'light' }, { day: 4, headache: true }],
        },
        {
          ...metadata,
          startDate: '2025-01-05',
          endDate: '2025-01-07',
          note: 'private note',
          symptoms: ['private symptom'],
          dailyLogs: [{ day: 1, headache: false }],
        },
        { ...metadata, startDate: '2025-02-05' },
      ],
      '2025-02-03',
    )

    expect(JSON.parse(output)).toEqual({
      version: 1,
      periods: [
        { startDay: 0, durationDays: 3, dailyLogs: [{ day: 1, headache: false }] },
        { startDay: 28, durationDays: 4, dailyLogs: [{ day: 2, flow: 'light' }] },
      ],
    })
  })
})
