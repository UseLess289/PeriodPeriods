import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PeriodDataStore } from '../../data/period-data-store'
import { parsePeriodBackup } from '../../data/period-backup'
import type { PeriodBackupV2 } from '../../data/period-backup'
import type { PeriodCsvPreview } from '../../data/period-data-store'
import { formatCivilDate } from '../shared/format-civil-date'

type BackupSettingsViewProps = {
  store: PeriodDataStore
  onImported: () => Promise<void>
  onBackupExported?: () => void
  locale?: 'fr' | 'en'
}

function getBackupDateSummary(backup: PeriodBackupV2): string | null {
  const dates = backup.periods.map(({ startDate }) => startDate).sort()
  if (dates.length === 0) return null
  if (dates.length === 1) return formatCivilDate(dates[0])
  return `${formatCivilDate(dates[0])} au ${formatCivilDate(dates.at(-1)!)}`
}

export function BackupSettingsView({ store, onImported, onBackupExported, locale = 'fr' }: BackupSettingsViewProps) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileButtonRef = useRef<HTMLButtonElement>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const csvFileButtonRef = useRef<HTMLButtonElement>(null)
  const [preview, setPreview] = useState<PeriodBackupV2 | null>(null)
  const [backupJson, setBackupJson] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [importFormat, setImportFormat] = useState<'csv' | 'flo'>('csv')
  const [csvPreview, setCsvPreview] = useState<PeriodCsvPreview | null>(null)
  const [csvMessage, setCsvMessage] = useState('')
  const [csvError, setCsvError] = useState('')
  const [isCsvImporting, setIsCsvImporting] = useState(false)
  const [csvSelectedFileName, setCsvSelectedFileName] = useState('')

  async function readCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    setCsvText(null)
    setCsvPreview(null)
    setCsvMessage('')
    setCsvError('')
    setCsvSelectedFileName(file?.name ?? '')
    if (!file) return
    try {
      const contents = await file.text()
      const format = file.name.toLowerCase().endsWith('.json') ? 'flo' : 'csv'
      const preview = format === 'flo' ? await store.previewFloExport(contents) : await store.previewPeriodCsv(contents)
      setImportFormat(format)
      setCsvText(contents)
      setCsvPreview(preview)
    } catch {
      setCsvError(
        text(
          'Fichier invalide. Vérifie le format et les dates avant de réessayer.',
          'Invalid file. Check its format and dates, then try again.',
        ),
      )
    }
  }

  async function confirmCsvImport() {
    if (!csvText || !csvPreview || isCsvImporting) return
    setIsCsvImporting(true)
    setCsvError('')
    try {
      const saved = importFormat === 'flo' ? await store.importFloExport(csvText) : await store.importPeriodCsv(csvText)
      await onImported()
      setCsvPreview(null)
      setCsvText(null)
      setCsvMessage(
        text(
          `${saved.length} période(s) ajoutée(s) depuis ${importFormat === 'flo' ? 'Flo' : 'le CSV'}.`,
          `${saved.length} period(s) added from ${importFormat === 'flo' ? 'Flo' : 'CSV'}.`,
        ),
      )
    } catch {
      setCsvError(
        text(
          'L’import a échoué. Aucune nouvelle période n’a été enregistrée.',
          'Import failed. No new periods were saved.',
        ),
      )
    } finally {
      setIsCsvImporting(false)
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

  async function readBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    setPreview(null)
    setBackupJson(null)
    setSelectedFileName(file?.name ?? '')
    setImportError(null)
    setImportMessage('')
    event.currentTarget.value = ''
    if (!file) return

    try {
      const json = await file.text()
      const parsed = parsePeriodBackup(json)
      setBackupJson(json)
      setPreview(parsed)
    } catch {
      setImportError(
        text(
          'Ce fichier ne correspond pas à une sauvegarde JSON v1 ou v2 valide. Choisis une autre sauvegarde.',
          'This is not a valid JSON v1 or v2 backup. Choose another file.',
        ),
      )
    }
  }

  async function confirmImport() {
    if (!backupJson || !preview) return
    setImportError(null)
    setImportMessage('')
    setIsImporting(true)
    let didReplaceData = false

    try {
      await store.importBackup(backupJson)
      didReplaceData = true
      await onImported()
      setPreview(null)
      setBackupJson(null)
      setSelectedFileName('')
      setImportMessage(
        text(
          `Sauvegarde importée. ${preview.periods.length} date${preview.periods.length === 1 ? '' : 's'} de début et les réglages ont remplacé les données précédentes.`,
          `Backup imported. ${preview.periods.length} start date(s) and settings replaced the previous data.`,
        ),
      )
      fileButtonRef.current?.focus()
    } catch {
      if (didReplaceData) {
        setPreview(null)
        setBackupJson(null)
        setSelectedFileName('')
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
      setIsImporting(false)
    }
  }

  function cancelImport() {
    setPreview(null)
    setBackupJson(null)
    setSelectedFileName('')
    setImportError(null)
    setImportMessage(
      text(
        'Import annulé. Les données présentes sur cet appareil n’ont pas été modifiées.',
        'Import cancelled. Data on this device was not changed.',
      ),
    )
    fileButtonRef.current?.focus()
  }

  const dateSummary = preview ? getBackupDateSummary(preview) : null

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
            onChange={readBackupFile}
          />
          <button
            className="secondary-button backup-file-button"
            ref={fileButtonRef}
            type="button"
            aria-describedby={importError ? 'backup-import-hint backup-import-error' : 'backup-import-hint'}
            onClick={() => fileInputRef.current?.click()}
          >
            {text('Choisir un fichier JSON', 'Choose JSON file')}
          </button>
          <span className="backup-file-name">{selectedFileName || text('Aucun fichier choisi', 'No file chosen')}</span>
        </div>
        <p className="field-hint" id="backup-import-hint">
          {text(
            'L’import valide le fichier avant toute modification et remplace les données présentes. Les anciennes notes de 1 à 5 sont converties à l’échelle actuelle de 1 à 3.',
            'The file is validated before any changes and replaces existing data. Legacy 1–5 ratings are converted to the current 1–3 scale.',
          )}
        </p>

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
              <button className="primary-button" type="button" disabled={isImporting} onClick={confirmImport}>
                {isImporting
                  ? text('Remplacement…', 'Replacing…')
                  : text('Remplacer les données actuelles', 'Replace current data')}
              </button>
              <button className="secondary-button" type="button" disabled={isImporting} onClick={cancelImport}>
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
            onChange={readCsvFile}
          />
          <button
            className="secondary-button backup-file-button"
            ref={csvFileButtonRef}
            type="button"
            onClick={() => csvFileInputRef.current?.click()}
          >
            {text('Choisir un fichier Flo JSON ou CSV', 'Choose a Flo JSON or CSV file')}
          </button>
          <span className="backup-file-name">
            {csvSelectedFileName || text('Aucun fichier choisi', 'No file chosen')}
          </span>
        </div>
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
            {csvPreview.conflictingStartDates.length > 0 ? (
              <p role="alert">
                {text('Débuts déjà présents :', 'Existing start dates:')} {csvPreview.conflictingStartDates.join(', ')}.{' '}
                {text(
                  'Aucun import possible tant que ces conflits subsistent.',
                  'Resolve these conflicts before importing.',
                )}
              </p>
            ) : (
              <button className="primary-button" type="button" disabled={isCsvImporting} onClick={confirmCsvImport}>
                {isCsvImporting
                  ? text('Import en cours…', 'Importing…')
                  : text('Confirmer l’ajout', 'Confirm addition')}
              </button>
            )}
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setCsvPreview(null)
                setCsvText(null)
                setCsvSelectedFileName('')
                csvFileButtonRef.current?.focus()
              }}
            >
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
