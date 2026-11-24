import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { CivilDate, NewPeriod, Period } from '../../domain/periods'
import type { Locale } from '../shared/format-civil-date'

type Props = {
  readonly locale?: Locale
  open: boolean
  today: CivilDate
  periods: readonly Period[]
  onClose: () => void
  onSave: (event: NewPeriod) => Promise<string | null>
}

const invalidDates = 'Vérifie les dates : la fin doit suivre le début et aucune date ne peut être future.'

// Includes the known errors returned by the app's save callback.
const englishErrors = new Map([
  [invalidDates, 'Check the dates: the end cannot be before the start, and neither date can be in the future.'],
  ['Une date future ne peut pas être enregistrée.', 'A future date cannot be recorded.'],
  ['L’enregistrement a échoué. Vérifie les données et réessaie.', 'Could not save. Check the details and try again.'],
])

export function PeriodEventDialog({ open, today, periods, onClose, onSave, locale = 'fr' }: Props) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const dialog = useRef<HTMLDialogElement>(null)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [error, setError] = useState<string | null>(null)
  const errorMessage = error && locale === 'en' ? (englishErrors.get(error) ?? error) : error
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  const existing = periods.find((period) => period.startDate === startDate)

  function changeStart(value: string) {
    setStartDate(value)
    const period = periods.find((item) => item.startDate === value)
    setEndDate(period?.endDate ?? '')
    setSymptoms(period?.symptoms?.join(', ') ?? '')
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!startDate || startDate > today || (endDate && (endDate < startDate || endDate > today))) {
      setError(invalidDates)
      return
    }
    setSaving(true)
    const issue = await onSave({
      startDate,
      ...(endDate ? { endDate } : {}),
      symptoms: symptoms
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    })
    setSaving(false)
    if (issue) {
      setError(issue)
      return
    }
    setStartDate(today)
    setEndDate('')
    setSymptoms('')
    setError(null)
    onClose()
  }

  return (
    <dialog
      ref={dialog}
      lang={locale}
      className="event-dialog"
      aria-labelledby="event-dialog-title"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose()
      }}
    >
      <form onSubmit={submit}>
        <h2 id="event-dialog-title">
          {existing
            ? text('Compléter une période', 'Edit period details')
            : text('Enregistrer une période', 'Record a period')}
        </h2>
        <p>
          {text(
            'Les données restent sur cet appareil. Une fin peut être ajoutée plus tard.',
            'Your data stays on this device. You can add an end date later.',
          )}
        </p>
        <label htmlFor="event-start">{text('Début des règles', 'Period start')}</label>
        <input
          id="event-start"
          type="date"
          required
          max={today}
          value={startDate}
          onChange={(event) => changeStart(event.target.value)}
        />
        <label htmlFor="event-end">{text('Fin des règles (facultatif)', 'Period end (optional)')}</label>
        <input
          id="event-end"
          type="date"
          min={startDate}
          max={today}
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
        <label htmlFor="event-symptoms">
          {text('Symptômes (séparés par des virgules)', 'Symptoms (separated by commas)')}
        </label>
        <textarea id="event-symptoms" value={symptoms} onChange={(event) => setSymptoms(event.target.value)} />
        {errorMessage && (
          <p role="alert" className="field-error">
            {errorMessage}
          </p>
        )}
        <div className="event-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            {text('Annuler', 'Cancel')}
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? text('Enregistrement…', 'Saving…') : text('Enregistrer', 'Save')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
