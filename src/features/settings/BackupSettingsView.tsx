import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DuplicatePeriodStartError, type PeriodDataStore } from '../../data/period-data-store'
import { parsePeriodBackup } from '../../data/period-backup'
import type { PeriodBackupV2 } from '../../data/period-backup'
import type { PeriodCsvPreview } from '../../data/period-data-store'
import { formatCivilDate } from '../shared/format-civil-date'

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024

type BackupSettingsViewProps = {
  store: PeriodDataStore
  onImported: () => Promise<void>
  onBackupExported?: () => void
  locale?: 'fr' | 'en'
}

function getDateSummary(periods: PeriodBackupV2['periods'] | PeriodCsvPreview['periods'], locale: 'fr' | 'en') {
  if (periods.length === 0) return null
  let first = periods[0].startDate
  let last = first
  for (const { startDate } of periods) {
    if (startDate < first) first = startDate
    if (startDate > last) last = startDate
  }
  return first === last
    ? formatCivilDate(first, locale)
    : `${formatCivilDate(first, locale)}${locale === 'en' ? ' to ' : ' au '}${formatCivilDate(last, locale)}`
}

type BackupSelection = { name: string; review?: { contents: string; preview: PeriodBackupV2 } }
type FileSelection = { name: string; review?: { contents: string; preview: PeriodCsvPreview; format: 'csv' | 'flo' } }

export function BackupSettingsView({ store, onImported, onBackupExported, locale = 'fr' }: BackupSettingsViewProps) {
  const text = useCallback((fr: string, en: string) => (locale === 'en' ? en : fr), [locale])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileButtonRef = useRef<HTMLButtonElement>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const csvFileButtonRef = useRef<HTMLButtonElement>(null)
  const backupConfirmButtonRef = useRef<HTMLButtonElement>(null)
  const csvConfirmButtonRef = useRef<HTMLButtonElement>(null)

  // A single token shared by both pickers. Every new selection or cancellation
  // (including an OS picker cancel, which yields no file) bumps it, so any
  // in-flight read from an older selection is discarded after it resolves.
  const selectionToken = useRef(0)
  const commitPending = useRef(false)

  const [backupSelection, setBackupSelection] = useState<BackupSelection | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isReadingBackup, setIsReadingBackup] = useState(false)

  const [fileSelection, setFileSelection] = useState<FileSelection | null>(null)
  const [csvMessage, setCsvMessage] = useState('')
  const [csvError, setCsvError] = useState('')
  const [isCsvImporting, setIsCsvImporting] = useState(false)
  const [isReadingCsv, setIsReadingCsv] = useState(false)
  const preview = backupSelection?.review?.preview
  const csvPreview = fileSelection?.review?.preview
  const importFormat = fileSelection?.review?.format
  const busy = isImporting || isCsvImporting

  // Invalidates any pending read in either picker and clears their busy flags.
  const beginSelection = useCallback((): number => {
    setBackupSelection(null)
    setFileSelection(null)
    setIsReadingBackup(false)
    setIsReadingCsv(false)
    setImportError(null)
    setImportMessage('')
    setCsvError('')
    setCsvMessage('')
    selectionToken.current += 1
    return selectionToken.current
  }, [])

  async function readBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (commitPending.current) return
    const token = beginSelection()
    if (!file) return
    setBackupSelection({ name: file.name })

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setImportError(
        text(
          'Ce fichier dépasse la limite de 10 Mio. Aucune donnée n’a été modifiée.',
          'This file exceeds the 10 MiB limit. No data was changed.',
        ),
      )
      return
    }

    setIsReadingBackup(true)
    try {
      const json = await file.text()
      if (selectionToken.current !== token) return
      setBackupSelection({ name: file.name, review: { contents: json, preview: parsePeriodBackup(json) } })
    } catch {
      if (selectionToken.current !== token) return
      setImportError(
        text(
          'Ce fichier ne correspond pas à une sauvegarde JSON v1 ou v2 valide. Choisis une autre sauvegarde.',
          'This is not a valid JSON v1 or v2 backup. Choose another file.',
        ),
      )
    } finally {
      if (selectionToken.current === token) setIsReadingBackup(false)
    }
  }

  async function readCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (commitPending.current) return
    const token = beginSelection()
    if (!file) return
    setFileSelection({ name: file.name })

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setCsvError(
        text(
          'Ce fichier dépasse la limite de 10 Mio. Aucune donnée n’a été modifiée.',
          'This file exceeds the 10 MiB limit. No data was changed.',
        ),
      )
      return
    }

    setIsReadingCsv(true)
    try {
      const contents = await file.text()
      if (selectionToken.current !== token) return
      const format = file.name.toLowerCase().endsWith('.json') ? 'flo' : 'csv'
      const preview = format === 'flo' ? await store.previewFloExport(contents) : await store.previewPeriodCsv(contents)
      if (selectionToken.current !== token) return
      setFileSelection({ name: file.name, review: { contents, format, preview } })
    } catch {
      if (selectionToken.current !== token) return
      setCsvError(
        text(
          'Fichier invalide. Vérifie le format et les dates avant de réessayer.',
          'Invalid file. Check its format and dates, then try again.',
        ),
      )
    } finally {
      if (selectionToken.current === token) setIsReadingCsv(false)
    }
  }

  async function confirmCsvImport() {
    const review = fileSelection?.review
    if (!review || review.preview.conflictingStartDates.length || commitPending.current) return
    commitPending.current = true
    setIsCsvImporting(true)
    setCsvError('')
    setCsvMessage('')
    let didSave = false
    try {
      const saved =
        review.format === 'flo'
          ? await store.importFloExport(review.contents)
          : await store.importPeriodCsv(review.contents)
      didSave = true
      setFileSelection(null)
      await onImported()
      setCsvMessage(
        text(
          `${saved.length} période(s) ajoutée(s) depuis ${importFormat === 'flo' ? 'Flo' : 'le CSV'}.`,
          `${saved.length} period(s) added from ${importFormat === 'flo' ? 'Flo' : 'CSV'}.`,
        ),
      )
    } catch (error) {
      if (didSave) {
        setCsvError(
          text(
            'L’import a été enregistré, mais l’affichage n’a pas pu être actualisé. Recharge l’application pour relire les données.',
            'The import was saved, but the display could not refresh. Reload the app to see your data.',
          ),
        )
      } else if (error instanceof DuplicatePeriodStartError) {
        setCsvError(
          text(
            'Un début de ce fichier est déjà enregistré. Aucune période n’a été ajoutée.',
            'A start date in this file is already recorded. No periods were added.',
          ),
        )
      } else {
        setCsvError(
          text(
            'L’import a échoué. Aucune nouvelle période n’a été enregistrée; tu peux réessayer.',
            'Import failed. No new periods were saved; you can try again.',
          ),
        )
      }
    } finally {
      commitPending.current = false
      setIsCsvImporting(false)
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) {
          if (didSave) csvFileButtonRef.current?.focus()
          else csvConfirmButtonRef.current?.focus()
        }
      })
    }
  }

  async function exportBackup() {
    setExportError(null)
    setExportMessage('')
    setIsExporting(true)
    let objectUrl: string | null = null

    try {
      const json = await store.exportBackup()
      objectUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `periodperiods-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }, 1000)
      setExportMessage(
        text(
          'Sauvegarde téléchargée. Le fichier contient tes données personnelles et les réglages conservés sur cet appareil.',
          'Backup downloaded. It contains your personal data and settings stored on this device.',
        ),
      )
      onBackupExported?.()
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setExportError(
        text(
          'La sauvegarde n’a pas pu être exportée. Vérifie le stockage de cet appareil et réessaie.',
          'Could not export the backup. Check device storage and try again.',
        ),
      )
    } finally {
      setIsExporting(false)
    }
  }

  async function confirmImport() {
    const review = backupSelection?.review
    if (!review || commitPending.current) return
    commitPending.current = true
    setImportError(null)
    setImportMessage('')
    setIsImporting(true)
    let didReplaceData = false

    try {
      await store.importBackup(review.contents)
      didReplaceData = true
      setBackupSelection(null)
      await onImported()
      const count = review.preview.periods.length
      setImportMessage(
        text(
          `Sauvegarde importée. ${count} date${count === 1 ? '' : 's'} de début et les réglages ont remplacé les données précédentes.`,
          `Backup imported. ${count} start date(s) and settings replaced the previous data.`,
        ),
      )
    } catch {
      if (didReplaceData) {
        setImportError(
          text(
            'La sauvegarde a remplacé les données, mais l’affichage n’a pas pu être actualisé. Recharge l’application pour les relire.',
            'The backup replaced your data, but the display could not refresh. Reload the app.',
          ),
        )
      } else {
        setImportError(
          text(
            'Le remplacement a échoué. Aucune donnée n’a été remplacée; tu peux réessayer.',
            'Replacement failed. No data was changed; you can try again.',
          ),
        )
      }
    } finally {
      commitPending.current = false
      setIsImporting(false)
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) {
          if (didReplaceData) fileButtonRef.current?.focus()
          else backupConfirmButtonRef.current?.focus()
        }
      })
    }
  }

  const cancelBackupSelection = useCallback(() => {
    if (commitPending.current) return
    beginSelection()
    setImportMessage(
      text(
        'Import annulé. Les données présentes sur cet appareil n’ont pas été modifiées.',
        'Import cancelled. Data on this device was not changed.',
      ),
    )
    fileButtonRef.current?.focus()
  }, [beginSelection, text])

  const cancelCsvSelection = useCallback(() => {
    if (commitPending.current) return
    beginSelection()
    setCsvMessage(text('Import annulé. Aucune donnée n’a été modifiée.', 'Import cancelled. No data was changed.'))
    csvFileButtonRef.current?.focus()
  }, [beginSelection, text])

  useEffect(() => {
    const backupInput = fileInputRef.current
    const csvInput = csvFileInputRef.current
    backupInput?.addEventListener('cancel', cancelBackupSelection)
    csvInput?.addEventListener('cancel', cancelCsvSelection)
    return () => {
      backupInput?.removeEventListener('cancel', cancelBackupSelection)
      csvInput?.removeEventListener('cancel', cancelCsvSelection)
    }
  }, [cancelBackupSelection, cancelCsvSelection])

  useEffect(
    () => () => {
      selectionToken.current += 1
    },
    [],
  )
  const dateSummary = getDateSummary(preview?.periods ?? csvPreview?.periods ?? [], locale)

  return (
    <section className="backup-settings" aria-labelledby="backup-settings-title">
      <div className="backup-intro">
        <p className="section-label">{text('Sur cet appareil', 'On this device')}</p>
        <h2 id="backup-settings-title">{text('Sauvegarde locale', 'Local backup')}</h2>
        <p>
          {text(
            'Exporte une sauvegarde JSON v2 ou importe une v1/v2. Elle contient les périodes et le premier jour de la semaine; la langue, le thème et les rappels restent sur cet appareil. Aucun compte ni synchronisation n’est utilisé.',
            'Export a JSON v2 backup or import v1/v2. It contains period data and the first day of the week; language, appearance, and reminder preferences stay on this device. No account or synchronization is used.',
          )}
        </p>
      </div>

      <section className="backup-action" aria-labelledby="backup-export-title">
        <h3 id="backup-export-title">{text('Exporter', 'Export')}</h3>
        <p>
          {text(
            'Crée un fichier JSON avec les dates de début et les réglages conservés localement.',
            'Create a JSON file with start dates and locally stored settings.',
          )}
        </p>
        <button className="primary-button" type="button" disabled={isExporting} onClick={exportBackup}>
          {isExporting ? text('Préparation…', 'Preparing…') : text('Télécharger la sauvegarde', 'Download backup')}
        </button>
        <p className="field-hint">
          {text(
            'Le fichier contient des données personnelles et les réglages conservés sur cet appareil. Garde-le en lieu sûr.',
            'This file contains personal data and settings from this device. Keep it somewhere safe.',
          )}
        </p>
        {exportError && (
          <p className="field-error" role="alert">
            {exportError}
          </p>
        )}
        <p id="backup-export-status" className="form-feedback" role="status" aria-live="polite" aria-atomic="true">
          {exportMessage}
        </p>
      </section>

      <section className="backup-action" aria-labelledby="backup-import-title">
        <h3 id="backup-import-title">{text('Importer', 'Import')}</h3>
        <p>
          {text(
            'Choisis une sauvegarde v1 ou v2 pour en vérifier le contenu avant le remplacement.',
            'Choose a v1 or v2 backup to review its contents before replacing data.',
          )}
        </p>
        <p className="file-picker-label">{text('Fichier de sauvegarde JSON', 'JSON backup file')}</p>
        <div className="backup-file-control">
          <input
            ref={fileInputRef}
            className="backup-file-input visually-hidden"
            id="period-backup-file"
            type="file"
            name="periodBackupFile"
            tabIndex={-1}
            accept="application/json,.json"
            aria-label={text('Fichier de sauvegarde JSON', 'JSON backup file')}
            aria-invalid={importError ? 'true' : undefined}
            aria-describedby={importError ? 'backup-import-hint backup-import-error' : 'backup-import-hint'}
            disabled={busy}
            onChange={readBackupFile}
          />
          <button
            className="secondary-button backup-file-button"
            ref={fileButtonRef}
            type="button"
            aria-describedby={importError ? 'backup-import-hint backup-import-error' : 'backup-import-hint'}
            disabled={busy}
            onClick={() => {
              beginSelection()
              fileInputRef.current?.click()
            }}
          >
            {text('Choisir un fichier JSON', 'Choose JSON file')}
          </button>
          <span className="backup-file-name">
            {backupSelection?.name || text('Aucun fichier choisi', 'No file chosen')}
          </span>
        </div>
        <p className="field-hint" id="backup-import-hint">
          {text(
            'L’import valide le fichier avant toute modification et remplace les données présentes. Les anciennes notes de 1 à 5 sont converties à l’échelle actuelle de 1 à 3.',
            'The file is validated before any changes and replaces existing data. Legacy 1–5 ratings are converted to the current 1–3 scale.',
          )}
        </p>

        {isReadingBackup && (
          <div className="backup-reading">
            <p role="status">{text('Lecture du fichier…', 'Reading file…')}</p>
            <button className="secondary-button" type="button" onClick={cancelBackupSelection}>
              {text('Annuler la lecture', 'Cancel reading')}
            </button>
          </div>
        )}

        {importError && (
          <p id="backup-import-error" className="field-error" role="alert">
            {importError}
          </p>
        )}

        {preview && (
          <div className="backup-preview" aria-labelledby="backup-preview-title">
            <h4 id="backup-preview-title">{text('Aperçu de la sauvegarde', 'Backup preview')}</h4>
            <dl>
              <div>
                <dt>{text('Format', 'Format')}</dt>
                <dd>JSON compatible</dd>
              </div>
              <div>
                <dt>{text('Dates de début', 'Start dates')}</dt>
                <dd>{preview.periods.length}</dd>
              </div>
              {dateSummary && (
                <div>
                  <dt>{text('Dates couvertes', 'Dates covered')}</dt>
                  <dd>{dateSummary}</dd>
                </div>
              )}
              <div>
                <dt>{text('Premier jour de la semaine', 'First day of week')}</dt>
                <dd>{preview.settings.firstDayOfWeek === 1 ? text('Lundi', 'Monday') : text('Dimanche', 'Sunday')}</dd>
              </div>
            </dl>
            <p className="backup-replacement-warning">
              {text(
                'Confirmer remplacera les dates et réglages actuellement enregistrés sur cet appareil. Cette action ne peut pas être annulée.',
                'Confirming replaces dates and settings on this device. This cannot be undone.',
              )}
            </p>
            <div className="backup-confirmation-actions">
              <button
                className="primary-button"
                ref={backupConfirmButtonRef}
                type="button"
                disabled={busy}
                onClick={confirmImport}
              >
                {isImporting
                  ? text('Remplacement…', 'Replacing…')
                  : text('Remplacer les données actuelles', 'Replace current data')}
              </button>
              <button className="secondary-button" type="button" disabled={busy} onClick={cancelBackupSelection}>
                {text('Annuler l’import', 'Cancel import')}
              </button>
            </div>
          </div>
        )}
        <p id="backup-import-status" className="form-feedback" role="status" aria-live="polite" aria-atomic="true">
          {importMessage}
        </p>
      </section>
      <section className="backup-action" aria-labelledby="csv-import-title">
        <h3 id="csv-import-title">{text('Importer depuis Flo ou CSV', 'Import from Flo or CSV')}</h3>
        <p>
          {text(
            'Flo : export JSON contenant operationalData.cycles. CSV : colonne startDate (AAAA-MM-JJ), avec endDate, flow, symptoms et note facultatifs. Les symptômes sont séparés par |.',
            'Flo: JSON export containing operationalData.cycles. CSV: startDate column (YYYY-MM-DD); optional endDate, flow, symptoms and note. Separate symptoms with |.',
          )}
        </p>
        <div className="backup-file-control">
          <input
            ref={csvFileInputRef}
            className="backup-file-input visually-hidden"
            id="csv-file-input"
            type="file"
            accept=".csv,text/csv,.json,application/json"
            tabIndex={-1}
            aria-label={text('Fichier Flo JSON ou CSV', 'Flo JSON or CSV file')}
            disabled={busy}
            onChange={readCsvFile}
          />
          <button
            className="secondary-button backup-file-button"
            ref={csvFileButtonRef}
            type="button"
            disabled={busy}
            onClick={() => {
              beginSelection()
              csvFileInputRef.current?.click()
            }}
          >
            {text('Choisir un fichier Flo JSON ou CSV', 'Choose a Flo JSON or CSV file')}
          </button>
          <span className="backup-file-name">
            {fileSelection?.name || text('Aucun fichier choisi', 'No file chosen')}
          </span>
        </div>

        {isReadingCsv && (
          <div className="backup-reading">
            <p role="status">{text('Lecture du fichier…', 'Reading file…')}</p>
            <button className="secondary-button" type="button" onClick={cancelCsvSelection}>
              {text('Annuler la lecture', 'Cancel reading')}
            </button>
          </div>
        )}

        {csvError && (
          <p className="field-error" role="alert">
            {csvError}
          </p>
        )}
        {csvPreview && (
          <div className="backup-preview">
            <p>
              {csvPreview.periods.length} {text('période(s) à ajouter depuis', 'period(s) to add from')}{' '}
              {importFormat === 'flo' ? 'Flo' : 'CSV'}.
            </p>
            {dateSummary && (
              <p>
                {text('Dates couvertes :', 'Dates covered:')} {dateSummary}
              </p>
            )}
            {csvPreview.conflictingStartDates.length > 0 ? (
              <p role="alert">
                {text('Débuts déjà présents :', 'Existing start dates:')}{' '}
                {csvPreview.conflictingStartDates.slice(0, 5).join(', ')}
                {csvPreview.conflictingStartDates.length > 5
                  ? text(
                      ` et ${csvPreview.conflictingStartDates.length - 5} autres.`,
                      ` and ${csvPreview.conflictingStartDates.length - 5} more.`,
                    )
                  : '.'}{' '}
                {text(
                  'Aucun import possible tant que ces conflits subsistent.',
                  'Resolve these conflicts before importing.',
                )}
              </p>
            ) : (
              <button
                className="primary-button"
                ref={csvConfirmButtonRef}
                type="button"
                disabled={busy}
                onClick={confirmCsvImport}
              >
                {isCsvImporting
                  ? text('Import en cours…', 'Importing…')
                  : text('Confirmer l’ajout', 'Confirm addition')}
              </button>
            )}
            <button className="secondary-button" type="button" disabled={busy} onClick={cancelCsvSelection}>
              {text('Annuler', 'Cancel')}
            </button>
          </div>
        )}
        <p className="form-feedback" role="status" aria-live="polite" aria-atomic="true">
          {csvMessage}
        </p>
      </section>
    </section>
  )
}
