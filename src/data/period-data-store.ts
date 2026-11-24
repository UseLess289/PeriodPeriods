import Dexie, { type Table } from 'dexie'
import { copyValidatedAppSettings, copyValidatedNewPeriod, DEFAULT_SETTINGS } from '../domain/periods'
import type { AppSettings, NewPeriod, Period, PeriodChanges } from '../domain/periods'
import { parsePeriodBackup, serializePeriodBackup } from './period-backup'

export { InvalidBackupError } from './period-backup'

interface SettingsRow {
  key: 'app'
  value: AppSettings
}

class PeriodDatabase extends Dexie {
  periods!: Table<Period, string>
  settings!: Table<SettingsRow, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      periods: 'id,&startDate',
      settings: 'key',
    })
  }
}

export interface PeriodDataStore {
  addPeriod(input: NewPeriod): Promise<Period>
  addPeriods(inputs: NewPeriod[]): Promise<Period[]>
  deletePeriod(id: string): Promise<boolean>
  getPeriod(id: string): Promise<Period | undefined>
  getPeriods(): Promise<Period[]>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<AppSettings>
  exportBackup(): Promise<string>
  importBackup(json: string): Promise<void>
  updatePeriod(id: string, changes: PeriodChanges): Promise<Period>
  close(): void
}

export class DuplicatePeriodStartError extends Error {
  constructor(startDate: string) {
    super(`Une période existe déjà pour le ${startDate}.`)
    this.name = 'DuplicatePeriodStartError'
  }
}

export class PeriodNotFoundError extends Error {
  constructor(id: string) {
    super(`Aucune période ne correspond à l’identifiant ${id}.`)
    this.name = 'PeriodNotFoundError'
  }
}

function isConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'ConstraintError'
}

function readPeriods(database: PeriodDatabase): Promise<Period[]> {
  return database.periods.orderBy('startDate').toArray()
}

async function readSettings(database: PeriodDatabase): Promise<AppSettings> {
  const row = await database.settings.get('app')
  return row ? { ...row.value } : { ...DEFAULT_SETTINGS }
}

export function createPeriodDataStore(databaseName = 'PeriodPeriods'): PeriodDataStore {
  const database = new PeriodDatabase(databaseName)

  return {
    async addPeriod(input) {
      const fields = copyValidatedNewPeriod(input)

      const now = new Date().toISOString()
      const period: Period = {
        ...fields,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      }

      return database.transaction('rw', database.periods, async () => {
        const duplicate = await database.periods.where('startDate').equals(period.startDate).first()
        if (duplicate) throw new DuplicatePeriodStartError(period.startDate)

        await database.periods.add(period)
        return period
      })
    },

    async addPeriods(inputs) {
      const fields = inputs.map(copyValidatedNewPeriod)
      const seenStarts = new Set<string>()
      for (const { startDate } of fields) {
        if (seenStarts.has(startDate)) throw new DuplicatePeriodStartError(startDate)
        seenStarts.add(startDate)
      }

      if (fields.length === 0) return []

      const now = new Date().toISOString()
      const periods: Period[] = fields.map((periodFields) => ({
        ...periodFields,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      }))

      return database.transaction('rw', database.periods, async () => {
        for (const period of periods) {
          const duplicate = await database.periods.where('startDate').equals(period.startDate).first()
          if (duplicate) throw new DuplicatePeriodStartError(period.startDate)
        }

        await database.periods.bulkAdd(periods)
        return periods.sort((left, right) => left.startDate.localeCompare(right.startDate))
      })
    },

    deletePeriod(id) {
      return database.transaction('rw', database.periods, async () => {
        const current = await database.periods.get(id)
        if (!current) return false

        await database.periods.delete(id)
        return true
      })
    },

    getPeriod(id) {
      return database.periods.get(id)
    },

    getPeriods() {
      return readPeriods(database)
    },

    getSettings() {
      return readSettings(database)
    },

    async saveSettings(settings) {
      const value = copyValidatedAppSettings(settings)
      await database.settings.put({ key: 'app', value })
      return value
    },

    exportBackup() {
      return database.transaction('r', database.periods, database.settings, async () => {
        const [periods, settings] = await Promise.all([readPeriods(database), readSettings(database)])
        return serializePeriodBackup(periods, settings)
      })
    },

    async importBackup(json) {
      const backup = parsePeriodBackup(json)

      await database.transaction('rw', database.periods, database.settings, async () => {
        await database.periods.clear()
        if (backup.periods.length > 0) await database.periods.bulkAdd(backup.periods)
        await database.settings.put({ key: 'app', value: backup.settings })
      })
    },

    async updatePeriod(id, changes) {
      try {
        return await database.transaction('rw', database.periods, async () => {
          const current = await database.periods.get(id)
          if (!current) throw new PeriodNotFoundError(id)

          const fields = copyValidatedNewPeriod({ ...current, ...changes })
          const updated: Period = {
            ...fields,
            id: current.id,
            createdAt: current.createdAt,
            updatedAt: new Date().toISOString(),
          }
          await database.periods.put(updated)
          return updated
        })
      } catch (error) {
        if (isConstraintError(error) && changes.startDate !== undefined) {
          throw new DuplicatePeriodStartError(changes.startDate)
        }
        throw error
      }
    },

    close() {
      database.close()
    },
  }
}
