import { copyValidatedAppSettings, copyValidatedNewPeriod } from '../domain/periods'
import type { AppSettings, NewPeriod, Period } from '../domain/periods'

type BackupPeriodV1 = Period

export interface PeriodBackupV1 {
  version: 1
  periods: BackupPeriodV1[]
  settings: AppSettings
}

const BACKUP_V1_KEYS = ['version', 'periods', 'settings'] as const
const PERIOD_V1_KEYS = [
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
const SETTINGS_V1_KEYS = ['forecastMethod', 'firstDayOfWeek'] as const

function toBackupPeriodV1(period: Period): BackupPeriodV1 {
  const fields = copyValidatedNewPeriod(period)

  return {
    id: period.id,
    ...fields,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
  }
}

export function serializePeriodBackup(periods: Period[], settings: AppSettings): string {
  const backup: PeriodBackupV1 = {
    version: 1,
    periods: periods.map(toBackupPeriodV1),
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

function assertExactKeys(value: Record<string, unknown>, allowedKeys: readonly string[], context: string): void {
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.includes(key))
  if (unknownKey !== undefined) throw new InvalidBackupError(`${context} contains unsupported field "${unknownKey}".`)
}

function isCanonicalUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

export function parsePeriodBackup(json: string): PeriodBackupV1 {
  let payload: unknown
  try {
    payload = JSON.parse(json)
  } catch (error) {
    throw new InvalidBackupError('The backup is not valid JSON.', { cause: error })
  }

  if (!isRecord(payload)) throw new InvalidBackupError('The backup must be a JSON object.')
  assertExactKeys(payload, BACKUP_V1_KEYS, 'The backup')
  if (payload.version !== 1) throw new InvalidBackupError('Only backup version 1 is supported.')
  if (!Array.isArray(payload.periods)) throw new InvalidBackupError('The backup periods field must be an array.')
  if (!isRecord(payload.settings)) throw new InvalidBackupError('The backup settings field must be an object.')

  assertExactKeys(payload.settings, SETTINGS_V1_KEYS, 'The settings')
  let settings: AppSettings
  try {
    settings = copyValidatedAppSettings(payload.settings)
  } catch (error) {
    throw new InvalidBackupError('The backup settings are invalid.', { cause: error })
  }

  const ids = new Set<string>()
  const startDates = new Set<string>()
  const periods = payload.periods.map((value, index): BackupPeriodV1 => {
    if (!isRecord(value)) throw new InvalidBackupError(`Period ${index + 1} must be an object.`)
    assertExactKeys(value, PERIOD_V1_KEYS, `Period ${index + 1}`)

    let newPeriod: NewPeriod
    try {
      newPeriod = copyValidatedNewPeriod(value)
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

  return { version: 1, periods, settings }
}
