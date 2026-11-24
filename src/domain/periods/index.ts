import { isValid, parseISO } from 'date-fns'
import { millisecondsInDay } from 'date-fns/constants'

export type CivilDate = string

export type FlowLevel = 'light' | 'medium' | 'heavy'

export const DEFAULT_PERIOD_DURATION = 5

export const DAILY_INTENSITIES = ['flowIntensity', 'headacheIntensity', 'crampsIntensity', 'fatigueIntensity'] as const
export type DailyIntensity = (typeof DAILY_INTENSITIES)[number]
export type Intensity = 1 | 2 | 3 | 4 | 5

export type PeriodDay = {
  day: number
  flow?: FlowLevel
  headache?: boolean
} & Partial<Record<DailyIntensity, Intensity>>

export function pickDailyIntensities(entry: PeriodDay): Partial<Record<DailyIntensity, Intensity>> {
  const intensities: Partial<Record<DailyIntensity, Intensity>> = {}
  for (const key of DAILY_INTENSITIES) {
    const value = entry[key]
    if (value !== undefined) intensities[key] = value
  }
  return intensities
}

export type NewPeriod = {
  startDate: CivilDate
  /** Legacy import field. Stored periods use durationDays instead. */
  endDate?: CivilDate
  durationDays?: number
  dailyLogs?: PeriodDay[]
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

export function getPeriodDuration(period: NewPeriod): number {
  return (
    period.durationDays ??
    (period.endDate ? daysBetweenCivilDates(period.startDate, period.endDate) + 1 : DEFAULT_PERIOD_DURATION)
  )
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

  const { durationDays, dailyLogs } = value
  if (
    durationDays !== undefined &&
    (typeof durationDays !== 'number' ||
      !Number.isSafeInteger(durationDays) ||
      durationDays < 1 ||
      value.endDate !== undefined)
  ) {
    throw new RangeError('durationDays must be a positive integer and must not be combined with endDate')
  }
  if (dailyLogs !== undefined) {
    if (!Array.isArray(dailyLogs)) throw new TypeError('dailyLogs must be an array')
    const duration =
      typeof durationDays === 'number'
        ? durationDays
        : typeof value.endDate === 'string'
          ? daysBetweenCivilDates(value.startDate, value.endDate) + 1
          : DEFAULT_PERIOD_DURATION
    const seen = new Set<number>()
    for (const entry of dailyLogs as unknown[]) {
      if (
        !isRecord(entry) ||
        typeof entry.day !== 'number' ||
        !Number.isSafeInteger(entry.day) ||
        entry.day < 1 ||
        entry.day > duration ||
        seen.has(entry.day)
      ) {
        throw new RangeError('Daily logs must refer to distinct days within the period')
      }
      if (entry.flow !== undefined && entry.flow !== 'light' && entry.flow !== 'medium' && entry.flow !== 'heavy') {
        throw new TypeError('Invalid daily flow')
      }
      if (entry.headache !== undefined && typeof entry.headache !== 'boolean')
        throw new TypeError('Invalid headache value')
      for (const key of DAILY_INTENSITIES) {
        const level = entry[key]
        if (level !== undefined && (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 5)) {
          throw new RangeError(`${key} must be an integer from 1 to 5`)
        }
      }
      seen.add(entry.day)
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
    ...(value.durationDays === undefined ? {} : { durationDays: value.durationDays }),
    ...(value.dailyLogs === undefined
      ? {}
      : {
          dailyLogs: value.dailyLogs.map((entry) => ({
            day: entry.day,
            ...(entry.flow === undefined ? {} : { flow: entry.flow }),
            ...(entry.headache === undefined ? {} : { headache: entry.headache }),
            ...pickDailyIntensities(entry),
          })),
        }),
    ...(value.flow === undefined ? {} : { flow: value.flow }),
    ...(value.symptoms === undefined ? {} : { symptoms: [...value.symptoms] }),
    ...(value.note === undefined ? {} : { note: value.note }),
  }
}

export function normalizePeriod(value: unknown): Omit<NewPeriod, 'endDate'> & { durationDays: number } {
  const { endDate, ...fields } = copyValidatedNewPeriod(value)
  return { ...fields, durationDays: getPeriodDuration({ ...fields, endDate }) }
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
