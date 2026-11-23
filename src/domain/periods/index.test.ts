import { describe, expect, it } from 'vitest'
import { assertValidAppSettings, assertValidCivilDate, assertValidNewPeriod, daysBetweenCivilDates } from './index'

describe('civil-date validation', () => {
  it('accepts a canonical leap day', () => {
    expect(() => assertValidCivilDate('2024-02-29')).not.toThrow()
  })

  it.each(['2024-2-09', ' 2024-02-09', '2024-02-09\n', '2024-02-09T00:00:00Z', '20240209'])(
    'rejects the noncanonical date %j',
    (date) => {
      expect(() => assertValidCivilDate(date)).toThrow(/YYYY-MM-DD/)
    },
  )

  it.each(['2023-02-29', '1900-02-29', '2024-04-31', '2024-01-00', '2024-13-01'])(
    'rejects the impossible date %s and identifies the field',
    (date) => {
      expect(() => assertValidCivilDate(date, 'startDate')).toThrow(/startDate/)
    },
  )
})

describe('civil-day difference', () => {
  it.each([
    ['2024-12-31', '2025-01-01', 1],
    ['2025-01-01', '2024-12-31', -1],
    ['2024-02-28', '2024-03-01', 2],
    ['2024-02-29', '2024-02-29', 0],
    ['2024-03-10', '2024-03-11', 1], // New York springs forward.
    ['2024-11-03', '2024-11-04', 1], // New York falls back.
    ['2011-12-30', '2011-12-31', 1], // Apia skipped December 30 locally.
  ])('counts from %s to %s as %d days', (start, end, days) => {
    expect(daysBetweenCivilDates(start, end)).toBe(days)
  })
})

describe('new-period validation', () => {
  it('accepts a future start date without optional details', () => {
    expect(() => assertValidNewPeriod({ startDate: '9999-12-31' })).not.toThrow()
  })

  it.each([{ period: null }, { period: '2024-02-29' }, { period: [] }])(
    'requires a period object: %j',
    ({ period }) => {
      expect(() => assertValidNewPeriod(period)).toThrow(/period/)
    },
  )

  it.each([{}, { startDate: '2024-02-30' }, { startDate: 20240229 }])(
    'rejects an absent or invalid start in %j',
    (period) => {
      expect(() => assertValidNewPeriod(period)).toThrow(/startDate/)
    },
  )

  it.each(['2024-02-30', '2024-3-01', null])('rejects invalid end date %j', (endDate) => {
    expect(() => assertValidNewPeriod({ startDate: '2024-02-29', endDate })).toThrow(/endDate/)
  })

  it('rejects an end before the start', () => {
    expect(() => assertValidNewPeriod({ startDate: '2024-03-01', endDate: '2024-02-29' })).toThrow(/endDate/)
  })

  it.each(['2024-02-29', '2025-01-01'])('accepts a period ending on %s when it starts on February 29', (endDate) => {
    expect(() => assertValidNewPeriod({ startDate: '2024-02-29', endDate })).not.toThrow()
  })

  it.each(['light', 'medium', 'heavy'])('accepts %s flow', (flow) => {
    expect(() => assertValidNewPeriod({ startDate: '2024-02-29', flow })).not.toThrow()
  })

  it.each(['spotting', 'HEAVY', 2, null])('rejects invalid flow %j', (flow) => {
    expect(() => assertValidNewPeriod({ startDate: '2024-02-29', flow })).toThrow(/flow/)
  })

  it.each([{ symptoms: 'cramps' }, { symptoms: ['cramps', 2] }, { symptoms: Array<string>(1) }, { symptoms: null }])(
    'rejects symptoms that are not a string array: %j',
    (details) => {
      expect(() => assertValidNewPeriod({ startDate: '2024-02-29', ...details })).toThrow(/symptoms/)
    },
  )

  it.each([{ note: 42 }, { note: null }, { note: ['note'] }])('rejects a nonstring note: %j', ({ note }) => {
    expect(() => assertValidNewPeriod({ startDate: '2024-02-29', note })).toThrow(/note/)
  })

  it('accepts and leaves symptoms and notes as entered', () => {
    const period = { startDate: '2024-02-29', symptoms: ['  fatigue  ', 'crampes', 'crampes'], note: '  première\n' }

    assertValidNewPeriod(period)

    expect(period).toEqual({
      startDate: '2024-02-29',
      symptoms: ['  fatigue  ', 'crampes', 'crampes'],
      note: '  première\n',
    })
  })
})

describe('settings validation', () => {
  it('requires a settings object', () => {
    expect(() => assertValidAppSettings(null)).toThrow(/settings/)
  })

  it.each(['median-6', 'mean-6', 'weighted'])('accepts %s forecasts', (forecastMethod) => {
    expect(() => assertValidAppSettings({ forecastMethod, firstDayOfWeek: 1 })).not.toThrow()
  })

  it.each([undefined, 'median', 'WEIGHTED', null, 6])('rejects invalid forecast method %j', (forecastMethod) => {
    expect(() => assertValidAppSettings({ forecastMethod, firstDayOfWeek: 1 })).toThrow(/forecastMethod/)
  })

  it.each([0, 1])('accepts first day %d', (firstDayOfWeek) => {
    expect(() => assertValidAppSettings({ forecastMethod: 'median-6', firstDayOfWeek })).not.toThrow()
  })

  it.each([undefined, -1, 2, '1', true, null])('rejects invalid first day %j', (firstDayOfWeek) => {
    expect(() => assertValidAppSettings({ forecastMethod: 'median-6', firstDayOfWeek })).toThrow(/firstDayOfWeek/)
  })
})
