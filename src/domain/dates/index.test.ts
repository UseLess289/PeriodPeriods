import { describe, expect, it } from 'vitest'
import { addCivilDays, buildCalendarMonth, shiftCalendarMonth } from './index'

describe('calendar month dates', () => {
  it('builds a Monday-first month grid from the preceding Monday', () => {
    const days = buildCalendarMonth('2025-05-15', 1)

    expect(days).toHaveLength(35)
    expect(days[0]).toEqual({ date: '2025-04-28', inDisplayedMonth: false })
    expect(days.find((day) => day.date === '2025-05-01')).toEqual({ date: '2025-05-01', inDisplayedMonth: true })
    expect(days.at(-1)).toEqual({ date: '2025-06-01', inDisplayedMonth: false })
  })

  it('starts a Sunday-first grid on the preceding Sunday', () => {
    const days = buildCalendarMonth('2025-05-01', 0)

    expect(days[0]).toEqual({ date: '2025-04-27', inDisplayedMonth: false })
    expect(days[1]).toEqual({ date: '2025-04-28', inDisplayedMonth: false })
    expect(days[4]).toEqual({ date: '2025-05-01', inDisplayedMonth: true })
  })

  it('moves to adjacent months across year boundaries', () => {
    expect(shiftCalendarMonth('2024-12-19', 1)).toBe('2025-01-01')
    expect(shiftCalendarMonth('2025-01-04', -1)).toBe('2024-12-01')
  })

  it('includes every civil date in the month even when the local zone skipped one', () => {
    const days = buildCalendarMonth('2011-12-01', 1)

    expect(days.some((day) => day.date === '2011-12-30' && day.inDisplayedMonth)).toBe(true)
    expect(days.find((day) => day.date === '2011-12-31')?.inDisplayedMonth).toBe(true)
  })
})

describe('civil-day addition', () => {
  it('adds and subtracts whole calendar days across month and year boundaries', () => {
    expect(addCivilDays('2024-12-31', 1)).toBe('2025-01-01')
    expect(addCivilDays('2025-03-01', -1)).toBe('2025-02-28')
  })

  it('retains a civil date skipped by the Pacific/Apia timezone', () => {
    expect(addCivilDays('2011-12-29', 1)).toBe('2011-12-30')
    expect(addCivilDays('2011-12-29', 2)).toBe('2011-12-31')
  })
})
