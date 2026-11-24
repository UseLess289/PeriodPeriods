import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PeriodDataStore } from '../../data/period-data-store'
import { parsePeriodBackup } from '../../data/period-backup'
import type { PeriodBackupV1 } from '../../data/period-backup'
import { formatCivilDate } from '../shared/format-civil-date'

type BackupSettingsViewProps = {
  store: PeriodDataStore
  onImported: () => Promise<void>
}

function getBackupDateSummary(backup: PeriodBackupV1): string | null {
  const dates = backup.periods.map(({ startDate }) => startDate).sort()
  if (dates.length === 0) return null
  if (dates.length === 1) return formatCivilDate(dates[0])
  return `${formatCivilDate(dates[0])} au ${formatCivilDate(dates.at(-1)!)}`
}

export function BackupSettingsView({ store, onImported }: BackupSettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileButtonRef = useRef<HTMLButtonElement>(null)
  const [preview, setPreview] = useState<PeriodBackupV1 | null>(null)
  const [backupJson, setBackupJson] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

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
      link.download = `periodperiods-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }, 1000)
      setExportMessage(
        'Sauvegarde téléchargée. Le fichier contient tes données personnelles et les réglages conservés sur cet appareil.',
      )
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setExportError('La sauvegarde n’a pas pu être exportée. Vérifie le stockage de cet appareil et réessaie.')
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
      setImportError('Ce fichier ne correspond pas à une sauvegarde JSON v1 valide. Choisis une autre sauvegarde.')
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
        `Sauvegarde importée. ${preview.periods.length} date${preview.periods.length === 1 ? '' : 's'} de début et les réglages ont remplacé les données précédentes.`,
      )
      fileButtonRef.current?.focus()
    } catch {
      if (didReplaceData) {
        setPreview(null)
        setBackupJson(null)
        setSelectedFileName('')
        setImportError(
          'La sauvegarde a remplacé les données, mais l’affichage n’a pas pu être actualisé. Recharge l’application pour les relire.',
        )
      } else {
        setImportError('Le remplacement a échoué. Aucune donnée n’a été remplacée; tu peux réessayer.')
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
    setImportMessage('Import annulé. Les données présentes sur cet appareil n’ont pas été modifiées.')
    fileButtonRef.current?.focus()
  }

  const dateSummary = preview ? getBackupDateSummary(preview) : null

  return (
    <section className="backup-settings" aria-labelledby="backup-settings-title">
      <div className="backup-intro">
        <p className="section-label">Sur cet appareil</p>
        <h2 id="backup-settings-title">Sauvegarde locale</h2>
        <p>Exporte ou importe une sauvegarde JSON v1. Aucun compte ni synchronisation n’est utilisé.</p>
      </div>

      <section className="backup-action" aria-labelledby="backup-export-title">
        <h3 id="backup-export-title">Exporter</h3>
        <p>Crée un fichier JSON avec les dates de début et les réglages conservés localement.</p>
        <button className="primary-button" type="button" disabled={isExporting} onClick={exportBackup}>
          {isExporting ? 'Préparation…' : 'Télécharger la sauvegarde'}
        </button>
        <p className="field-hint">
          Le fichier contient des données personnelles et les réglages conservés sur cet appareil. Garde-le en lieu sûr.
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
        <h3 id="backup-import-title">Importer</h3>
        <p>Choisis une sauvegarde v1 pour en vérifier le contenu avant le remplacement.</p>
        <p className="file-picker-label">Fichier de sauvegarde JSON</p>
        <div className="backup-file-control">
          <input
            ref={fileInputRef}
            className="backup-file-input visually-hidden"
            id="period-backup-file"
            type="file"
            name="periodBackupFile"
            tabIndex={-1}
            accept="application/json,.json"
            aria-label="Fichier de sauvegarde JSON"
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
            Choisir un fichier JSON
          </button>
          <span className="backup-file-name">{selectedFileName || 'Aucun fichier choisi'}</span>
        </div>
        <p className="field-hint" id="backup-import-hint">
          L’import valide le fichier avant toute modification. Il remplace toutes les dates et réglages présents.
        </p>

        {importError && (
          <p id="backup-import-error" className="field-error" role="alert">
            {importError}
          </p>
        )}

        {preview && (
          <div className="backup-preview" aria-labelledby="backup-preview-title">
            <h4 id="backup-preview-title">Aperçu de la sauvegarde</h4>
            <dl>
              <div>
                <dt>Format</dt>
                <dd>JSON v1</dd>
              </div>
              <div>
                <dt>Dates de début</dt>
                <dd>{preview.periods.length}</dd>
              </div>
              {dateSummary && (
                <div>
                  <dt>Dates couvertes</dt>
                  <dd>{dateSummary}</dd>
                </div>
              )}
              <div>
                <dt>Premier jour de la semaine</dt>
                <dd>{preview.settings.firstDayOfWeek === 1 ? 'Lundi' : 'Dimanche'}</dd>
              </div>
            </dl>
            <p className="backup-replacement-warning">
              Confirmer remplacera les dates et réglages actuellement enregistrés sur cet appareil. Cette action ne peut
              pas être annulée.
            </p>
            <div className="backup-confirmation-actions">
              <button className="primary-button" type="button" disabled={isImporting} onClick={confirmImport}>
                {isImporting ? 'Remplacement…' : 'Remplacer les données actuelles'}
              </button>
              <button className="secondary-button" type="button" disabled={isImporting} onClick={cancelImport}>
                Annuler l’import
              </button>
            </div>
          </div>
        )}
        <p id="backup-import-status" className="form-feedback" role="status" aria-live="polite" aria-atomic="true">
          {importMessage}
        </p>
      </section>
    </section>
  )
}
