import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PeriodDataStore } from '../../data/period-data-store'
import { BackupSettingsView } from './BackupSettingsView'

const MAX_FILE_SIZE = 10 * 1024 * 1024

type FakeFile = {
  name: string
  size: number
  text: () => Promise<string>
}

function makeFile(name: string, text: () => Promise<string>, size = 32): FakeFile {
  return { name, size, text }
}

function makeStore() {
  return {
    previewPeriodCsv: vi.fn(),
    importPeriodCsv: vi.fn(),
    previewFloExport: vi.fn(),
    importFloExport: vi.fn(),
    importBackup: vi.fn(),
    exportBackup: vi.fn(),
  }
}

function backupJson(periods: Array<{ startDate: string; id?: string }> = [], version: 1 | 2 = 2): string {
  return JSON.stringify({
    version,
    periods: periods.map((period, index) => ({
      id: period.id ?? `period-${index}`,
      startDate: period.startDate,
      createdAt: `${period.startDate}T00:00:00.000Z`,
      updatedAt: `${period.startDate}T00:00:00.000Z`,
    })),
    settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
  })
}

const floJson = JSON.stringify({
  operationalData: {
    cycles: [{ period_start_date: '2025-03-08', period_end_date: '2025-03-12' }],
  },
})

function selectFile(input: HTMLElement, file: FakeFile) {
  if (!(input instanceof HTMLInputElement)) throw new TypeError('Expected a file input')
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const okImported = () => vi.fn().mockResolvedValue(undefined)

describe('BackupSettingsView', () => {
  it('binds the JSON filename, preview, exact payload and returns focus after import', async () => {
    const store = makeStore()
    store.importBackup.mockResolvedValue(undefined)
    const onImported = okImported()
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={onImported} />)

    const input = screen.getByLabelText('Fichier de sauvegarde JSON')
    const json = backupJson([{ startDate: '2025-03-08' }])
    selectFile(
      input,
      makeFile('sauvegarde.json', async () => json),
    )

    expect(await screen.findByRole('heading', { name: 'Aperçu de la sauvegarde' })).toBeInTheDocument()
    expect(screen.getByText('sauvegarde.json')).toBeInTheDocument()
    expect(screen.getByText('8 mars 2025')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remplacer les données actuelles' }))

    expect(await screen.findByText(/Sauvegarde importée/)).toBeInTheDocument()
    expect(store.importBackup).toHaveBeenCalledExactlyOnceWith(json)
    expect(onImported).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Choisir un fichier JSON' })).toHaveFocus())
    expect(screen.queryByRole('heading', { name: 'Aperçu de la sauvegarde' })).not.toBeInTheDocument()
  })

  it('accepts a v1 backup and shows its preview', async () => {
    const store = makeStore()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier de sauvegarde JSON')
    selectFile(
      input,
      makeFile('legacy.json', async () => backupJson([{ startDate: '2025-01-01' }], 1)),
    )

    expect(await screen.findByRole('heading', { name: 'Aperçu de la sauvegarde' })).toBeInTheDocument()
    expect(screen.getByText('JSON compatible')).toBeInTheDocument()
  })

  it('confirms a CSV import with its exact payload and success message', async () => {
    const store = makeStore()
    store.previewPeriodCsv.mockResolvedValue({ periods: [{ startDate: '2025-03-08' }], conflictingStartDates: [] })
    store.importPeriodCsv.mockResolvedValue([{ startDate: 'a' }, { startDate: 'b' }])
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier Flo JSON ou CSV')
    const csv = 'startDate\n2025-03-08\n'
    selectFile(
      input,
      makeFile('periodes.csv', async () => csv),
    )

    expect(await screen.findByRole('button', { name: 'Confirmer l’ajout' })).toBeInTheDocument()
    expect(screen.getByText('periodes.csv')).toBeInTheDocument()
    expect(store.previewPeriodCsv).toHaveBeenCalledExactlyOnceWith(csv)

    await user.click(screen.getByRole('button', { name: 'Confirmer l’ajout' }))

    expect(await screen.findByText(/2 période\(s\) ajoutée\(s\) depuis le CSV/)).toBeInTheDocument()
    expect(store.importPeriodCsv).toHaveBeenCalledExactlyOnceWith(csv)
  })

  it('detects Flo by the .json extension and confirms the Flo payload', async () => {
    const store = makeStore()
    store.previewFloExport.mockResolvedValue({ periods: [{ startDate: '2025-03-08' }], conflictingStartDates: [] })
    store.importFloExport.mockResolvedValue([{ startDate: 'a' }])
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier Flo JSON ou CSV')
    selectFile(
      input,
      makeFile('flo-export.json', async () => floJson),
    )

    expect(await screen.findByRole('button', { name: 'Confirmer l’ajout' })).toBeInTheDocument()
    expect(store.previewFloExport).toHaveBeenCalledExactlyOnceWith(floJson)
    expect(store.previewPeriodCsv).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirmer l’ajout' }))

    expect(await screen.findByText(/ajoutée\(s\) depuis Flo/)).toBeInTheDocument()
    expect(store.importFloExport).toHaveBeenCalledExactlyOnceWith(floJson)
    expect(store.importPeriodCsv).not.toHaveBeenCalled()
  })

  it('switches type when the same picker receives a CSV then a Flo file', async () => {
    const store = makeStore()
    store.previewPeriodCsv.mockResolvedValue({ periods: [{ startDate: '2025-03-08' }], conflictingStartDates: [] })
    store.previewFloExport.mockResolvedValue({ periods: [{ startDate: '2025-04-01' }], conflictingStartDates: [] })
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier Flo JSON ou CSV')

    selectFile(
      input,
      makeFile('a.csv', async () => 'startDate\n2025-03-08\n'),
    )
    await screen.findByText(/à ajouter depuis CSV/)
    expect(store.previewPeriodCsv).toHaveBeenCalledOnce()

    selectFile(
      input,
      makeFile('b.json', async () => floJson),
    )
    await screen.findByText(/à ajouter depuis Flo/)
    expect(store.previewFloExport).toHaveBeenCalledExactlyOnceWith(floJson)
  })

  it('discards a slow read when a newer file is chosen in the same picker', async () => {
    const store = makeStore()
    store.previewPeriodCsv.mockResolvedValue({ periods: [{ startDate: '2025-03-20' }], conflictingStartDates: [] })
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier Flo JSON ou CSV')
    const slow = deferred<string>()

    selectFile(
      input,
      makeFile('slow.csv', () => slow.promise),
    )
    selectFile(
      input,
      makeFile('fast.csv', async () => 'startDate\n2025-03-20\n'),
    )

    await screen.findByRole('button', { name: 'Confirmer l’ajout' })
    expect(store.previewPeriodCsv).toHaveBeenLastCalledWith('startDate\n2025-03-20\n')

    slow.resolve('startDate\n2025-01-01\n')
    await act(async () => {
      await slow.promise
    })

    expect(store.previewPeriodCsv).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Confirmer l’ajout' })).toBeInTheDocument()
  })

  it('discards a slow JSON read when a Flo file is chosen in the other picker', async () => {
    const store = makeStore()
    store.previewFloExport.mockResolvedValue({ periods: [{ startDate: '2025-03-08' }], conflictingStartDates: [] })
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const jsonInput = screen.getByLabelText('Fichier de sauvegarde JSON')
    const csvInput = screen.getByLabelText('Fichier Flo JSON ou CSV')
    const slow = deferred<string>()

    selectFile(
      jsonInput,
      makeFile('slow.json', () => slow.promise),
    )
    expect(screen.getByRole('button', { name: 'Annuler la lecture' })).toBeInTheDocument()

    selectFile(
      csvInput,
      makeFile('flo.json', async () => floJson),
    )
    await screen.findByRole('button', { name: 'Confirmer l’ajout' })

    slow.resolve(backupJson([{ startDate: '2025-01-01' }]))
    await act(async () => {
      await slow.promise
    })

    expect(screen.queryByRole('heading', { name: 'Aperçu de la sauvegarde' })).not.toBeInTheDocument()
    expect(screen.queryByText('slow.json')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer l’ajout' })).toBeInTheDocument()
  })

  it('lets the user cancel an explicit pending read before it resolves', async () => {
    const store = makeStore()
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier de sauvegarde JSON')
    const slow = deferred<string>()

    selectFile(
      input,
      makeFile('pending.json', () => slow.promise),
    )
    expect(screen.getByRole('button', { name: 'Annuler la lecture' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Annuler la lecture' }))
    expect(screen.getByText(/Import annulé/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choisir un fichier JSON' })).toHaveFocus()

    slow.resolve(backupJson([{ startDate: '2025-01-01' }]))
    await act(async () => {
      await slow.promise
    })

    expect(screen.queryByRole('heading', { name: 'Aperçu de la sauvegarde' })).not.toBeInTheDocument()
  })

  it('invalidates a pending read when the OS picker is cancelled', async () => {
    const store = makeStore()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier de sauvegarde JSON')
    const slow = deferred<string>()

    selectFile(
      input,
      makeFile('pending.json', () => slow.promise),
    )
    expect(screen.getByText('pending.json')).toBeInTheDocument()

    fireEvent(input, new Event('cancel', { bubbles: true }))

    expect(screen.queryByText('pending.json')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Annuler la lecture' })).not.toBeInTheDocument()

    slow.resolve(backupJson([{ startDate: '2025-01-01' }]))
    await act(async () => {
      await slow.promise
    })

    expect(screen.queryByRole('heading', { name: 'Aperçu de la sauvegarde' })).not.toBeInTheDocument()
  })

  it('keeps a retryable preview when the JSON write fails', async () => {
    const store = makeStore()
    store.importBackup.mockRejectedValue(new Error('disk full'))
    const onImported = vi.fn()
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={onImported} />)

    const input = screen.getByLabelText('Fichier de sauvegarde JSON')
    selectFile(
      input,
      makeFile('backup.json', async () => backupJson([{ startDate: '2025-03-08' }])),
    )
    await screen.findByRole('button', { name: 'Remplacer les données actuelles' })

    await user.click(screen.getByRole('button', { name: 'Remplacer les données actuelles' }))

    expect(await screen.findByText(/Aucune donnée/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remplacer les données actuelles' })).toBeInTheDocument()
    expect(onImported).not.toHaveBeenCalled()
  })

  it('separates a refresh failure after a successful JSON write from a write failure', async () => {
    const store = makeStore()
    store.importBackup.mockResolvedValue(undefined)
    const onImported = vi.fn().mockRejectedValue(new Error('refresh failed'))
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={onImported} />)

    const input = screen.getByLabelText('Fichier de sauvegarde JSON')
    selectFile(
      input,
      makeFile('backup.json', async () => backupJson([{ startDate: '2025-03-08' }])),
    )
    await screen.findByRole('button', { name: 'Remplacer les données actuelles' })

    await user.click(screen.getByRole('button', { name: 'Remplacer les données actuelles' }))

    expect(await screen.findByText(/a remplacé les données/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Aperçu de la sauvegarde' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remplacer les données actuelles' })).not.toBeInTheDocument()
  })

  it('keeps a retryable preview when the CSV write fails', async () => {
    const store = makeStore()
    store.previewPeriodCsv.mockResolvedValue({ periods: [{ startDate: '2025-03-08' }], conflictingStartDates: [] })
    store.importPeriodCsv.mockRejectedValue(new Error('disk full'))
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier Flo JSON ou CSV')
    selectFile(
      input,
      makeFile('data.csv', async () => 'startDate\n2025-03-08\n'),
    )
    await screen.findByRole('button', { name: 'Confirmer l’ajout' })

    await user.click(screen.getByRole('button', { name: 'Confirmer l’ajout' }))

    expect(await screen.findByText(/Aucune nouvelle période/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer l’ajout' })).toBeInTheDocument()
  })

  it('separates a refresh failure after a successful CSV write without re-confirming', async () => {
    const store = makeStore()
    store.previewPeriodCsv.mockResolvedValue({ periods: [{ startDate: '2025-03-08' }], conflictingStartDates: [] })
    store.importPeriodCsv.mockResolvedValue([{ startDate: 'a' }, { startDate: 'b' }])
    const onImported = vi.fn().mockRejectedValue(new Error('refresh failed'))
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={onImported} />)

    const input = screen.getByLabelText('Fichier Flo JSON ou CSV')
    selectFile(
      input,
      makeFile('data.csv', async () => 'startDate\n2025-03-08\n'),
    )
    await screen.findByRole('button', { name: 'Confirmer l’ajout' })

    await user.click(screen.getByRole('button', { name: 'Confirmer l’ajout' }))

    expect(await screen.findByText(/a été enregistré/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmer l’ajout' })).not.toBeInTheDocument()
  })

  it('disables duplicate and cross-picker confirmation while an import is in flight', async () => {
    const store = makeStore()
    const importDeferred = deferred<void>()
    store.importBackup.mockReturnValue(importDeferred.promise)
    store.previewPeriodCsv.mockResolvedValue({ periods: [{ startDate: '2025-03-08' }], conflictingStartDates: [] })
    const user = userEvent.setup()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    selectFile(
      screen.getByLabelText('Fichier de sauvegarde JSON'),
      makeFile('backup.json', async () => backupJson([{ startDate: '2025-03-08' }])),
    )
    const confirm = await screen.findByRole('button', { name: 'Remplacer les données actuelles' })
    await user.click(confirm)

    expect(store.importBackup).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Remplacement…' })).toBeDisabled()

    const read = vi.fn(async () => 'startDate\n2025-03-08\n')
    const csvInput = screen.getByLabelText('Fichier Flo JSON ou CSV')
    expect(csvInput).toBeDisabled()
    selectFile(csvInput, makeFile('data.csv', read))
    expect(read).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Confirmer l’ajout' })).not.toBeInTheDocument()

    importDeferred.resolve()
    expect(await screen.findByText(/Sauvegarde importée/)).toBeInTheDocument()
  })

  it('reads JSON files at or just under the 10 MiB limit', async () => {
    for (const size of [MAX_FILE_SIZE - 1, MAX_FILE_SIZE]) {
      const store = makeStore()
      const textFn = vi.fn(async () => backupJson([{ startDate: '2025-03-08' }]))
      const view = render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

      selectFile(screen.getByLabelText('Fichier de sauvegarde JSON'), makeFile(`size-${size}.json`, textFn, size))

      expect(await screen.findByRole('heading', { name: 'Aperçu de la sauvegarde' })).toBeInTheDocument()
      expect(textFn).toHaveBeenCalledOnce()
      view.unmount()
    }
  })

  it('rejects an oversized JSON file before reading its content', async () => {
    const store = makeStore()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier de sauvegarde JSON')
    const textFn = vi.fn(async () => backupJson([{ startDate: '2025-03-08' }]))
    selectFile(input, makeFile('huge.json', textFn, MAX_FILE_SIZE + 1))

    expect(await screen.findByText(/limite de 10 Mio/)).toBeInTheDocument()
    expect(textFn).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Aperçu de la sauvegarde' })).not.toBeInTheDocument()
  })

  it('rejects an oversized CSV or Flo file before reading its content', async () => {
    const store = makeStore()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} />)

    const input = screen.getByLabelText('Fichier Flo JSON ou CSV')
    const textFn = vi.fn(async () => floJson)
    selectFile(input, makeFile('huge.json', textFn, MAX_FILE_SIZE + 1))

    expect(await screen.findByText(/limite de 10 Mio/)).toBeInTheDocument()
    expect(textFn).not.toHaveBeenCalled()
    expect(store.previewFloExport).not.toHaveBeenCalled()
    expect(store.previewPeriodCsv).not.toHaveBeenCalled()
  })

  it('renders the English copy for the size guard when locale is en', async () => {
    const store = makeStore()
    render(<BackupSettingsView store={store as unknown as PeriodDataStore} onImported={okImported()} locale="en" />)

    const input = screen.getByLabelText('JSON backup file')
    selectFile(
      input,
      makeFile(
        'huge.json',
        vi.fn(async () => '{}'),
        MAX_FILE_SIZE + 1,
      ),
    )

    expect(await screen.findByText(/10 MiB limit/)).toBeInTheDocument()
  })
})
