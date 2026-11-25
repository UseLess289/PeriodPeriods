import { assertValidCivilDate } from '../periods'
import type { CivilDate } from '../periods'

export type CalendarDay = {
  date: CivilDate
  inDisplayedMonth: boolean
}

function asUtcDate(date: CivilDate): Date {
  assertValidCivilDate(date)
  return new Date(`${date}T00:00:00.000Z`)
}

function toCivilDate(date: Date): CivilDate {
  return date.toISOString().slice(0, 10)
}

export function addCivilDays(date: CivilDate, dayOffset: number): CivilDate {
  if (!Number.isInteger(dayOffset)) throw new TypeError('dayOffset must be an integer')

  const shifted = asUtcDate(date)
  shifted.setUTCDate(shifted.getUTCDate() + dayOffset)
  return toCivilDate(shifted)
}

/** Derived dates may fall beyond the supported four-digit civil calendar. */
export function tryAddCivilDays(date: CivilDate, dayOffset: number): CivilDate | null {
  if (!Number.isSafeInteger(dayOffset)) return null
  try {
    const shifted = addCivilDays(date, dayOffset)
    return /^\d{4}-\d{2}-\d{2}$/.test(shifted) ? shifted : null
  } catch {
    return null
  }
}

export function shiftCalendarMonth(date: CivilDate, monthOffset: number): CivilDate {
  if (!Number.isInteger(monthOffset)) throw new TypeError('monthOffset must be an integer')

  const shifted = asUtcDate(date)
  shifted.setUTCDate(1)
  shifted.setUTCMonth(shifted.getUTCMonth() + monthOffset)
  return toCivilDate(shifted)
}

export function buildCalendarMonth(date: CivilDate, firstDayOfWeek: 0 | 1): CalendarDay[] {
  const monthStart = asUtcDate(date)
  monthStart.setUTCDate(1)
  const monthPrefix = toCivilDate(monthStart).slice(0, 7)
  const daysInMonthDate = new Date(monthStart.getTime())
  daysInMonthDate.setUTCMonth(daysInMonthDate.getUTCMonth() + 1)
  daysInMonthDate.setUTCDate(0)
  const daysInMonth = daysInMonthDate.getUTCDate()
  const offset = (monthStart.getUTCDay() - firstDayOfWeek + 7) % 7
  const dayCount = Math.ceil((offset + daysInMonth) / 7) * 7
  const firstGridDate = new Date(monthStart.getTime())
  firstGridDate.setUTCDate(1 - offset)

  return Array.from({ length: dayCount }, (_, index) => {
    const current = new Date(firstGridDate.getTime())
    current.setUTCDate(firstGridDate.getUTCDate() + index)
    const civilDate = toCivilDate(current)
    return { date: civilDate, inDisplayedMonth: civilDate.startsWith(monthPrefix) }
  })
}
