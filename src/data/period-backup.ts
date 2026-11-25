import {
  convertLegacyIntensityToThreeLevels,
  copyValidatedAppSettings,
  copyValidatedNewPeriod,
  DAILY_INTENSITIES,
} from '../domain/periods'
import type { AppSettings, NewPeriod, Period } from '../domain/periods'

export interface PeriodBackupV2 {
  version: 2
  periods: Period[]
  settings: AppSettings
}

const BACKUP_KEYS = ['version', 'periods', 'settings'] as const
const PERIOD_KEYS = [
  'id',
  'startDate',
  'endDate',
  'durationDays',
  'dailyLogs',
  'flow',
  'symptoms',
  'note',
  'createdAt',
  'updatedAt',
] as const
const SETTINGS_KEYS = ['forecastMethod', 'firstDayOfWeek'] as const

function toBackupPeriod(period: Period): Period {
  const fields = copyValidatedNewPeriod(period)

  return {
    id: period.id,
    ...fields,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
  }
}

export function serializePeriodBackup(periods: Period[], settings: AppSettings): string {
  const backup: PeriodBackupV2 = {
    version: 2,
    periods: periods.map(toBackupPeriod),
    settings: copyValidatedAppSettings(settings),
  }
  return JSON.stringify(backup, null, 2)
}

export class InvalidBackupError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'InvalidBackupError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function migrateV1DailyIntensities(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.dailyLogs)) return value

  return {
    ...value,
    dailyLogs: value.dailyLogs.map((entry) => {
      if (!isRecord(entry)) return entry
      const converted = { ...entry }
      for (const key of DAILY_INTENSITIES) {
        const level = entry[key]
        if (typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 5) {
          converted[key] = convertLegacyIntensityToThreeLevels(level)
        }
      }
      return converted
    }),
  }
}

function assertExactKeys(value: Record<string, unknown>, allowedKeys: readonly string[], context: string): void {
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.includes(key))
  if (unknownKey !== undefined) throw new InvalidBackupError(`${context} contains unsupported field "${unknownKey}".`)
}

function isCanonicalUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

export function parsePeriodBackup(json: string): PeriodBackupV2 {
  let payload: unknown
  try {
    payload = JSON.parse(json)
  } catch (error) {
    throw new InvalidBackupError('The backup is not valid JSON.', { cause: error })
  }

  if (!isRecord(payload)) throw new InvalidBackupError('The backup must be a JSON object.')
  assertExactKeys(payload, BACKUP_KEYS, 'The backup')
  if (payload.version !== 1 && payload.version !== 2) {
    throw new InvalidBackupError('Only backup versions 1 and 2 are supported.')
  }
  const backupVersion = payload.version
  if (!Array.isArray(payload.periods)) throw new InvalidBackupError('The backup periods field must be an array.')
  if (!isRecord(payload.settings)) throw new InvalidBackupError('The backup settings field must be an object.')

  assertExactKeys(payload.settings, SETTINGS_KEYS, 'The settings')
  let settings: AppSettings
  try {
    settings = copyValidatedAppSettings(payload.settings)
  } catch (error) {
    throw new InvalidBackupError('The backup settings are invalid.', { cause: error })
  }

  const ids = new Set<string>()
  const startDates = new Set<string>()
  const periods = payload.periods.map((value, index): Period => {
    if (!isRecord(value)) throw new InvalidBackupError(`Period ${index + 1} must be an object.`)
    assertExactKeys(value, PERIOD_KEYS, `Period ${index + 1}`)

    let newPeriod: NewPeriod
    try {
      newPeriod = copyValidatedNewPeriod(backupVersion === 1 ? migrateV1DailyIntensities(value) : value)
    } catch (error) {
      throw new InvalidBackupError(`Period ${index + 1} is invalid.`, { cause: error })
    }

    const id = value.id
    const createdAt = value.createdAt
    const updatedAt = value.updatedAt
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new InvalidBackupError(`Period ${index + 1} must have a non-empty id.`)
    }
    if (!isCanonicalUtcTimestamp(createdAt) || !isCanonicalUtcTimestamp(updatedAt)) {
      throw new InvalidBackupError(`Period ${index + 1} must have valid ISO 8601 timestamps.`)
    }
    if (ids.has(id)) throw new InvalidBackupError(`Duplicate period id "${id}".`)
    if (startDates.has(newPeriod.startDate)) {
      throw new InvalidBackupError(`Duplicate period start date "${newPeriod.startDate}".`)
    }

    ids.add(id)
    startDates.add(newPeriod.startDate)
    return { ...newPeriod, id, createdAt, updatedAt }
  })

  return { version: 2, periods, settings }
}
