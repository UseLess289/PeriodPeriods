import { isValid, parseISO } from 'date-fns'
import { millisecondsInDay } from 'date-fns/constants'

export type CivilDate = string

export type FlowLevel = 'light' | 'medium' | 'heavy'

export type NewPeriod = {
  startDate: CivilDate
  endDate?: CivilDate
  flow?: FlowLevel
  symptoms?: string[]
  note?: string
}

export type Period = NewPeriod & {
  id: string
  createdAt: string
  updatedAt: string
}

export type PeriodChanges = Partial<NewPeriod>

export type AppSettings = {
  forecastMethod: 'median-6' | 'mean-6' | 'weighted'
  firstDayOfWeek: 0 | 1
}

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  forecastMethod: 'median-6',
  firstDayOfWeek: 1,
})

function parseCivilDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must be a civil date in YYYY-MM-DD format`)
  }

  // Use UTC only as a temporary calendar coordinate, not as the stored date.
  const date = parseISO(`${value}T00:00:00Z`)
  if (!isValid(date)) {
    throw new RangeError(`${field} must be a real calendar date`)
  }
  return date
}

export function assertValidCivilDate(value: unknown, field = 'date'): asserts value is CivilDate {
  parseCivilDate(value, field)
}

export function daysBetweenCivilDates(start: CivilDate, end: CivilDate): number {
  const startDay = parseCivilDate(start, 'start')
  const endDay = parseCivilDate(end, 'end')
  return (endDay.getTime() - startDay.getTime()) / millisecondsInDay
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function assertValidNewPeriod(value: unknown): asserts value is NewPeriod {
  if (!isRecord(value)) {
    throw new TypeError('period must be an object')
  }

  assertValidCivilDate(value.startDate, 'startDate')
  if (value.endDate !== undefined) {
    assertValidCivilDate(value.endDate, 'endDate')
    if (value.endDate < value.startDate) {
      throw new RangeError('endDate must be on or after startDate')
    }
  }

  const { flow } = value
  if (flow !== undefined && flow !== 'light' && flow !== 'medium' && flow !== 'heavy') {
    throw new TypeError('flow must be light, medium, or heavy')
  }

  const { symptoms } = value
  if (symptoms !== undefined) {
    if (!Array.isArray(symptoms)) {
      throw new TypeError('symptoms must be an array of strings')
    }
    for (const symptom of symptoms) {
      if (typeof symptom !== 'string') {
        throw new TypeError('symptoms must be an array of strings')
      }
    }
  }

  const { note } = value
  if (note !== undefined && typeof note !== 'string') {
    throw new TypeError('note must be a string')
  }
}

export function copyValidatedNewPeriod(value: unknown): NewPeriod {
  assertValidNewPeriod(value)
  return {
    startDate: value.startDate,
    ...(value.endDate === undefined ? {} : { endDate: value.endDate }),
    ...(value.flow === undefined ? {} : { flow: value.flow }),
    ...(value.symptoms === undefined ? {} : { symptoms: [...value.symptoms] }),
    ...(value.note === undefined ? {} : { note: value.note }),
  }
}

export function assertValidAppSettings(value: unknown): asserts value is AppSettings {
  if (!isRecord(value)) {
    throw new TypeError('settings must be an object')
  }

  const { forecastMethod, firstDayOfWeek } = value
  if (forecastMethod !== 'median-6' && forecastMethod !== 'mean-6' && forecastMethod !== 'weighted') {
    throw new TypeError('forecastMethod must be median-6, mean-6, or weighted')
  }

  if (firstDayOfWeek !== 0 && firstDayOfWeek !== 1) {
    throw new TypeError('firstDayOfWeek must be 0 (Sunday) or 1 (Monday)')
  }
}

export function copyValidatedAppSettings(value: unknown): AppSettings {
  assertValidAppSettings(value)
  return {
    forecastMethod: value.forecastMethod,
    firstDayOfWeek: value.firstDayOfWeek,
  }
}
