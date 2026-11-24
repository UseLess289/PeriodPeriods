import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPeriodDataStore, DuplicatePeriodStartError } from './period-data-store'

describe('period data store', () => {
  let databaseName: string
  let store: ReturnType<typeof createPeriodDataStore>

  beforeEach(() => {
    databaseName = `periodperiods-test-${Date.now()}-${Math.random()}`
    store = createPeriodDataStore(databaseName)
  })

  afterEach(() => {
    store.close()
  })

  it('stores a period and returns its locally generated identity and timestamps', async () => {
    const saved = await store.addPeriod({ startDate: '2025-03-08' })

    expect(saved).toMatchObject({ startDate: '2025-03-08' })
    expect(saved.id).toBeTruthy()
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(saved.updatedAt).toBe(saved.createdAt)
    await expect(store.getPeriod(saved.id)).resolves.toEqual(saved)
    await expect(store.getPeriods()).resolves.toEqual([saved])
  })

  it('keeps optional details independent from the caller input', async () => {
    const symptoms = ['fatigue']
    const input = { startDate: '2025-03-08', symptoms }
    const saved = await store.addPeriod(input)
    symptoms.push('crampes')

    await expect(store.getPeriod(saved.id)).resolves.toMatchObject({ symptoms: ['fatigue'] })
  })

  it('updates period details without changing its identity or creation time', async () => {
    const created = await store.addPeriod({ startDate: '2025-03-08' })
    await new Promise((resolve) => setTimeout(resolve, 5))

    const updated = await store.updatePeriod(created.id, { endDate: '2025-03-12', note: 'Douleurs légères' })

    expect(updated).toMatchObject({
      id: created.id,
      startDate: created.startDate,
      createdAt: created.createdAt,
      endDate: '2025-03-12',
      note: 'Douleurs légères',
    })
    expect(updated.updatedAt).not.toBe(created.updatedAt)
    await expect(store.getPeriod(created.id)).resolves.toEqual(updated)
  })

  it('clears optional period details when their update value is undefined', async () => {
    const created = await store.addPeriod({
      startDate: '2025-03-08',
      endDate: '2025-03-12',
      flow: 'medium',
      symptoms: ['fatigue'],
      note: 'À revoir',
    })

    const updated = await store.updatePeriod(created.id, {
      endDate: undefined,
      flow: undefined,
      symptoms: undefined,
      note: undefined,
    })

    expect(updated).toMatchObject({ id: created.id, startDate: created.startDate })
    expect(updated.endDate).toBeUndefined()
    expect(updated.flow).toBeUndefined()
    expect(updated.symptoms).toBeUndefined()
    expect(updated.note).toBeUndefined()
  })

  it('rejects an update that duplicates another period start', async () => {
    const original = await store.addPeriod({ startDate: '2025-03-08' })
    const other = await store.addPeriod({ startDate: '2025-03-20' })

    await expect(store.updatePeriod(other.id, { startDate: original.startDate })).rejects.toThrow('2025-03-08')
    await expect(store.getPeriod(other.id)).resolves.toEqual(other)
  })

  it('rejects duplicate start dates without replacing the existing period', async () => {
    const original = await store.addPeriod({ startDate: '2025-03-08' })

    await expect(store.addPeriod({ startDate: '2025-03-08' })).rejects.toThrow('2025-03-08')
    await expect(store.getPeriods()).resolves.toEqual([original])
  })

  it('reports a typed duplicate error when an add races with deletion', async () => {
    const existing = await store.addPeriod({ startDate: '2025-03-08' })

    const [addResult] = await Promise.allSettled([
      store.addPeriod({ startDate: existing.startDate }),
      store.deletePeriod(existing.id),
    ])

    if (addResult.status === 'rejected') {
      expect(addResult.reason).toBeInstanceOf(DuplicatePeriodStartError)
    } else {
      expect(addResult.value.startDate).toBe(existing.startDate)
    }
  })

  it('returns periods in chronological order', async () => {
    const later = await store.addPeriod({ startDate: '2025-03-20' })
    const earlier = await store.addPeriod({ startDate: '2025-03-08' })

    await expect(store.getPeriods()).resolves.toEqual([earlier, later])
  })

  it('adds multiple distinct start dates atomically and returns them chronologically', async () => {
    const added = await store.addPeriods([{ startDate: '2025-03-20' }, { startDate: '2025-03-08' }])

    expect(added.map(({ startDate }) => startDate)).toEqual(['2025-03-08', '2025-03-20'])
    await expect(store.getPeriods()).resolves.toEqual(added)
  })

  it('does not add any starts when a batch contains an existing or repeated date', async () => {
    const existing = await store.addPeriod({ startDate: '2025-03-08' })

    await expect(store.addPeriods([{ startDate: '2025-03-20' }, { startDate: '2025-03-08' }])).rejects.toBeInstanceOf(
      DuplicatePeriodStartError,
    )
    await expect(store.addPeriods([{ startDate: '2025-03-20' }, { startDate: '2025-03-20' }])).rejects.toBeInstanceOf(
      DuplicatePeriodStartError,
    )

    await expect(store.getPeriods()).resolves.toEqual([existing])
  })

  it('does not reject overlapping periods when their start dates differ', async () => {
    await store.addPeriod({ startDate: '2025-03-08', endDate: '2025-03-20' })
    await store.addPeriod({ startDate: '2025-03-15', endDate: '2025-03-22' })

    await expect(store.getPeriods()).resolves.toHaveLength(2)
  })

  it('deletes an existing period', async () => {
    const period = await store.addPeriod({ startDate: '2025-03-08' })

    await expect(store.deletePeriod(period.id)).resolves.toBe(true)
    await expect(store.getPeriod(period.id)).resolves.toBeUndefined()
  })

  it('reports false when asked to delete an absent id', async () => {
    const period = await store.addPeriod({ startDate: '2025-03-08' })
    await store.deletePeriod(period.id)

    await expect(store.deletePeriod(period.id)).resolves.toBe(false)
  })

  it('persists periods after closing and reopening the local database', async () => {
    const saved = await store.addPeriod({ startDate: '2025-03-08', flow: 'medium' })
    const settings = { forecastMethod: 'weighted', firstDayOfWeek: 0 } as const
    await store.saveSettings(settings)
    store.close()
    store = createPeriodDataStore(databaseName)

    await expect(store.getPeriod(saved.id)).resolves.toEqual(saved)
    await expect(store.getSettings()).resolves.toEqual(settings)
  })

  it('returns the default settings when none have been saved', async () => {
    await expect(store.getSettings()).resolves.toEqual({ forecastMethod: 'median-6', firstDayOfWeek: 1 })
  })

  it('persists an explicit settings change', async () => {
    const settings = { forecastMethod: 'weighted', firstDayOfWeek: 0 } as const
    await store.saveSettings(settings)

    await expect(store.getSettings()).resolves.toEqual(settings)
  })

  it('exports periods and current settings in the version 1 envelope', async () => {
    const period = await store.addPeriod({ startDate: '2025-03-08', flow: 'medium' })
    const settings = { forecastMethod: 'mean-6', firstDayOfWeek: 0 } as const
    await store.saveSettings(settings)

    const backup = JSON.parse(await store.exportBackup())

    expect(backup).toEqual({ version: 1, periods: [period], settings })
  })

  it('restores the same periods and settings from its own export', async () => {
    const first = await store.addPeriod({ startDate: '2025-03-08', flow: 'light' })
    const second = await store.addPeriod({ startDate: '2025-04-11', note: 'Quelques crampes' })
    const settings = { forecastMethod: 'weighted', firstDayOfWeek: 0 } as const
    await store.saveSettings(settings)
    const backup = await store.exportBackup()
    await store.deletePeriod(first.id)
    await store.deletePeriod(second.id)

    await store.importBackup(backup)

    await expect(store.getPeriods()).resolves.toEqual([first, second])
    await expect(store.getSettings()).resolves.toEqual(settings)
  })

  it('exports an empty backup with default settings', async () => {
    const backup = JSON.parse(await store.exportBackup())
    expect(backup).toEqual({
      version: 1,
      periods: [],
      settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
    })
  })

  it('imports an empty backup by clearing periods and restoring its settings', async () => {
    const existing = await store.addPeriod({ startDate: '2025-03-08' })
    const backup = JSON.stringify({
      version: 1,
      periods: [],
      settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
    })

    await store.importBackup(backup)

    await expect(store.getPeriod(existing.id)).resolves.toBeUndefined()
    await expect(store.getPeriods()).resolves.toEqual([])
    await expect(store.getSettings()).resolves.toEqual({ forecastMethod: 'median-6', firstDayOfWeek: 1 })
  })

  it('replaces local periods and settings when a valid backup is imported', async () => {
    const existing = await store.addPeriod({ startDate: '2025-03-08' })
    await store.saveSettings({ forecastMethod: 'mean-6', firstDayOfWeek: 0 })
    const restored = {
      id: 'backup-period-1',
      startDate: '2025-04-02',
      endDate: '2025-04-06',
      flow: 'light',
      symptoms: ['fatigue'],
      note: 'Restored from backup',
      createdAt: '2025-04-02T08:00:00.000Z',
      updatedAt: '2025-04-02T08:00:00.000Z',
    }
    const settings = { forecastMethod: 'weighted', firstDayOfWeek: 1 }
    const backup = { version: 1, periods: [restored], settings }

    await store.importBackup(JSON.stringify(backup))

    await expect(store.getPeriod(existing.id)).resolves.toBeUndefined()
    await expect(store.getPeriods()).resolves.toEqual([restored])
    await expect(store.getSettings()).resolves.toEqual(settings)
  })

  it('accepts extended-year timestamps in canonical JavaScript Date format', async () => {
    const period = {
      id: 'extended-timestamp',
      startDate: '2025-03-08',
      createdAt: '+010000-01-01T00:00:00.000Z',
      updatedAt: '+010000-01-01T00:00:00.000Z',
    }
    const backup = JSON.stringify({
      version: 1,
      periods: [period],
      settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
    })

    await store.importBackup(backup)

    await expect(store.getPeriod(period.id)).resolves.toEqual(period)
  })

  it('rolls back all data if the second IndexedDB record write fails during import', async () => {
    const existing = await store.addPeriod({ startDate: '2025-03-08', note: 'Keep this record' })
    const existingSettings = { forecastMethod: 'mean-6', firstDayOfWeek: 0 } as const
    await store.saveSettings(existingSettings)
    const backup = JSON.stringify({
      version: 1,
      periods: [
        {
          id: 'replacement',
          startDate: '2025-04-02',
          createdAt: '2025-04-02T08:00:00.000Z',
          updatedAt: '2025-04-02T08:00:00.000Z',
        },
      ],
      settings: { forecastMethod: 'weighted', firstDayOfWeek: 1 },
    })
    let writeCount = 0
    const failOnSecondWrite = () => {
      writeCount += 1
      if (writeCount === 2) throw new DOMException('Simulated storage failure', 'QuotaExceededError')
    }
    const nativeAdd = IDBObjectStore.prototype.add
    const nativePut = IDBObjectStore.prototype.put
    const add = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof nativeAdd>
    ) {
      failOnSecondWrite()
      return nativeAdd.apply(this, args)
    })
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof nativePut>
    ) {
      failOnSecondWrite()
      return nativePut.apply(this, args)
    })

    try {
      await expect(store.importBackup(backup)).rejects.toThrow('Simulated storage failure')
    } finally {
      add.mockRestore()
      put.mockRestore()
    }

    await expect(store.getPeriods()).resolves.toEqual([existing])
    await expect(store.getSettings()).resolves.toEqual(existingSettings)
  })

  it.each([
    ['unknown version', { version: 2, periods: [], settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 } }],
    [
      'unknown envelope key',
      { version: 1, periods: [], settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 }, extra: true },
    ],
    [
      'invalid date',
      {
        version: 1,
        periods: [
          {
            id: 'bad-date',
            startDate: '2025-02-30',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'end before start',
      {
        version: 1,
        periods: [
          {
            id: 'bad-range',
            startDate: '2025-03-10',
            endDate: '2025-03-09',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    ['invalid settings', { version: 1, periods: [], settings: { forecastMethod: 'unknown', firstDayOfWeek: 1 } }],
    [
      'empty-key setting',
      { version: 1, periods: [], settings: { forecastMethod: 'median-6', firstDayOfWeek: 1, '': 'unexpected' } },
    ],
    [
      'unknown period key',
      {
        version: 1,
        periods: [
          {
            id: 'unknown-field',
            startDate: '2025-03-08',
            createdAt: '2025-03-08T00:00:00.000Z',
            updatedAt: '2025-03-08T00:00:00.000Z',
            futureField: 'unexpected',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'empty identifier',
      {
        version: 1,
        periods: [
          {
            id: '   ',
            startDate: '2025-03-08',
            createdAt: '2025-03-08T00:00:00.000Z',
            updatedAt: '2025-03-08T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'missing timestamp',
      {
        version: 1,
        periods: [
          {
            id: 'missing-time',
            startDate: '2025-03-08',
            createdAt: '2025-03-08T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'non-UTC timestamp',
      {
        version: 1,
        periods: [
          {
            id: 'local-time',
            startDate: '2025-03-08',
            createdAt: '2025-03-08T01:00:00+01:00',
            updatedAt: '2025-03-08T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'date-only timestamp',
      {
        version: 1,
        periods: [
          {
            id: 'date-only',
            startDate: '2025-03-08',
            createdAt: '2025-03-08Z',
            updatedAt: '2025-03-08T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'noncanonical timestamp',
      {
        version: 1,
        periods: [
          {
            id: 'noncanonical-time',
            startDate: '2025-03-08',
            createdAt: '2025-03-08T00:00:00Z',
            updatedAt: '2025-03-08T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'timestamp with two time zones',
      {
        version: 1,
        periods: [
          {
            id: 'two-zones',
            startDate: '2025-03-08',
            createdAt: '2025-03-08T08:00+01:00Z',
            updatedAt: '2025-03-08T08:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'unrepresentable leap-second timestamp',
      {
        version: 1,
        periods: [
          {
            id: 'leap-second',
            startDate: '2016-12-31',
            createdAt: '2016-12-31T23:59:60Z',
            updatedAt: '2016-12-31T23:59:59.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'duplicate ids',
      {
        version: 1,
        periods: [
          {
            id: 'duplicate',
            startDate: '2025-03-08',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'duplicate',
            startDate: '2025-03-09',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
    [
      'duplicate start dates',
      {
        version: 1,
        periods: [
          {
            id: 'first',
            startDate: '2025-03-08',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'second',
            startDate: '2025-03-08',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      },
    ],
  ])('rejects %s backups without changing current data', async (_case, backup) => {
    const existing = await store.addPeriod({ startDate: '2025-01-12', note: 'Keep this record' })
    const settings = { forecastMethod: 'mean-6', firstDayOfWeek: 0 } as const
    await store.saveSettings(settings)

    await expect(store.importBackup(JSON.stringify(backup))).rejects.toThrow()

    await expect(store.getPeriods()).resolves.toEqual([existing])
    await expect(store.getSettings()).resolves.toEqual(settings)
  })

  it('rejects malformed JSON without changing current data', async () => {
    const existing = await store.addPeriod({ startDate: '2025-01-12' })

    await expect(store.importBackup('{')).rejects.toThrow(/valid JSON/)

    await expect(store.getPeriods()).resolves.toEqual([existing])
  })
})
