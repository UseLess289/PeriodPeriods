import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidPeriodCsvError, parsePeriodCsv } from './period-csv'
import { createPeriodDataStore, DuplicatePeriodStartError } from './period-data-store'

describe('PeriodPeriods CSV schema', () => {
  it('reads reordered columns, a BOM, and notes with commas, escaped quotes, and line breaks', () => {
    const csv =
      '\uFEFFnote,symptoms,flow,startDate,endDate\r\n' +
      '"Tired, then ""better""\r\nle soir",fatigue | cramps,medium,2024-02-29,2024-03-02\r\n' +
      '\r\n,,,2024-03-27,'

    expect(parsePeriodCsv(csv)).toEqual([
      {
        startDate: '2024-02-29',
        endDate: '2024-03-02',
        flow: 'medium',
        symptoms: ['fatigue', 'cramps'],
        note: 'Tired, then "better"\r\nle soir',
      },
      { startDate: '2024-03-27' },
    ])
  })

  it.each([
    ['empty file', '\uFEFF\r\n', null],
    ['header only', 'startDate\n', null],
    ['missing start column', 'endDate\n2025-03-08', 1],
    ['unrecognized format', '{"periods":[]}', 1],
    ['unknown column', 'startDate,extra\n2025-03-08,x', 1],
    ['repeated column', 'startDate,note,note\n2025-03-08,a,b', 1],
    ['different separator', 'startDate;endDate\n2025-03-08;2025-03-12', 1],
    ['wrong cell count', 'startDate,note\n2025-03-08', 2],
    ['invalid quoting', 'startDate,note\n2025-03-08,"text"suffix', 2],
    ['unclosed quote', 'startDate,note\n2025-03-08,"text', 2],
    ['impossible date', 'startDate\n2025-02-29', 2],
    ['reversed date range', 'startDate,endDate\n2025-03-08,2025-03-07', 2],
    ['invalid flow', 'startDate,flow\n2025-03-08,unknown', 2],
    ['empty symptom', 'startDate,symptoms\n2025-03-08,fatigue||cramps', 2],
    ['repeated start after a multiline note', 'startDate,note\n2025-03-08,"first\nnote"\n2025-03-08,second', 4],
  ])('rejects %s with its source line where applicable', (_case, csv, line) => {
    expect(() => parsePeriodCsv(csv)).toThrow(expect.objectContaining({ name: 'InvalidPeriodCsvError', line }))
  })
})

describe('period CSV persistence', () => {
  let databaseName: string
  let store: ReturnType<typeof createPeriodDataStore>

  beforeEach(() => {
    databaseName = `period-csv-${crypto.randomUUID()}`
    store = createPeriodDataStore(databaseName)
  })

  afterEach(async () => {
    store.close()
    await Dexie.delete(databaseName)
  })

  it('previews matching start dates without writing any rows', async () => {
    const existing = await store.addPeriod({ startDate: '2025-03-08', note: 'Original' })
    const csv = 'startDate,note\n2025-03-20,New\n2025-03-08,Incoming'

    await expect(store.previewPeriodCsv(csv)).resolves.toEqual({
      periods: [
        { startDate: '2025-03-20', note: 'New' },
        { startDate: '2025-03-08', note: 'Incoming' },
      ],
      conflictingStartDates: ['2025-03-08'],
    })
    await expect(store.getPeriods()).resolves.toEqual([existing])
  })

  it('persists new periods without replacing existing periods or settings', async () => {
    const existing = await store.addPeriod({ startDate: '2025-03-08' })
    const settings = await store.saveSettings({ forecastMethod: 'weighted', firstDayOfWeek: 0 })
    const csv = 'startDate,note\n2025-04-20,Later\n2025-03-20,Earlier'

    const added = await store.importPeriodCsv(csv)
    store.close()
    store = createPeriodDataStore(databaseName)

    expect(added.map(({ startDate, note }) => ({ startDate, note }))).toEqual([
      { startDate: '2025-03-20', note: 'Earlier' },
      { startDate: '2025-04-20', note: 'Later' },
    ])
    await expect(store.getPeriods()).resolves.toEqual([existing, ...added])
    await expect(store.getSettings()).resolves.toEqual(settings)
  })

  it('rejects all rows when a start date becomes occupied after preview', async () => {
    const csv = 'startDate\n2025-03-20\n2025-03-08'
    await expect(store.previewPeriodCsv(csv)).resolves.toMatchObject({ conflictingStartDates: [] })
    const existing = await store.addPeriod({ startDate: '2025-03-08' })

    await expect(store.importPeriodCsv(csv)).rejects.toBeInstanceOf(DuplicatePeriodStartError)

    await expect(store.getPeriods()).resolves.toEqual([existing])
  })

  it('does not persist earlier rows when a later CSV row is invalid', async () => {
    const csv = 'startDate\n2025-03-20\n2025-02-30'

    await expect(store.importPeriodCsv(csv)).rejects.toBeInstanceOf(InvalidPeriodCsvError)

    await expect(store.getPeriods()).resolves.toEqual([])
  })

  it('rolls back the first insert when IndexedDB rejects the second insert', async () => {
    const existing = await store.addPeriod({ startDate: '2025-03-08' })
    const nextId = crypto.randomUUID()
    const ids = vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(nextId).mockReturnValueOnce(nextId)

    try {
      await expect(store.importPeriodCsv('startDate\n2025-03-20\n2025-04-20')).rejects.toMatchObject({
        name: 'BulkError',
      })
    } finally {
      ids.mockRestore()
    }

    await expect(store.getPeriods()).resolves.toEqual([existing])
  })
})
