import { describe, expect, it } from 'vitest'
import { InvalidFloExportError, parseFloExport } from './flo-import'

describe('Flo JSON import', () => {
  it('reads dated cycle records from operationalData', () => {
    const exportJson = JSON.stringify({
      operationalData: {
        cycles: [
          { period_start_date: '2025-01-29T00:00:00.000Z', period_end_date: '2025-01-30' },
          { period_start_date: '2025-01-01', period_end_date: '2025-01-03' },
        ],
      },
    })
    expect(parseFloExport(exportJson)).toEqual([
      { startDate: '2025-01-01', endDate: '2025-01-03' },
      { startDate: '2025-01-29', endDate: '2025-01-30' },
    ])
  })

  it.each([
    '{}',
    '{bad',
    '{"operationalData":{"cycles":[]}}',
    '{"operationalData":{"cycles":[{}]}}',
    '{"operationalData":{"cycles":[{"period_start_date":null,"period_end_date":"2025-02-02"}]}}',
    '{"operationalData":{"cycles":[{"period_start_date":"2025-02-30","period_end_date":"2025-03-02"}]}}',
  ])('rejects unsupported or invalid export %s', (json) => {
    expect(() => parseFloExport(json)).toThrow(InvalidFloExportError)
  })
})
