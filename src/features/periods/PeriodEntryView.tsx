import { ChevronRight, LockKeyhole } from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { CivilDate, Period } from '../../domain/periods'
import type { PeriodStartEstimate } from '../../domain/forecast/estimate-next-period'
import { formatCivilDate } from '../shared/format-civil-date'

export type PeriodSaveError = {
  message: string
  invalidDate: boolean
}

type PeriodEntryViewProps = {
  periods: Period[]
  estimate: PeriodStartEstimate
  today: CivilDate
  saveMessage: string | null
  saveError: PeriodSaveError | null
  onClearSaveError: () => void
  onSave: (startDate: CivilDate) => Promise<boolean>
  onOpenCalendar: () => void
}

export function PeriodEntryView({
  periods,
  estimate,
  today,
  saveMessage,
  saveError,
  onClearSaveError,
  onSave,
  onOpenCalendar,
}: PeriodEntryViewProps) {
  const [startDate, setStartDate] = useState(today)
  const [dateError, setDateError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const startDateInputRef = useRef<HTMLInputElement>(null)
  const latestPeriod = periods.at(-1)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDateError(null)
    onClearSaveError()

    if (!startDate) {
      setDateError('Choisis une date de début.')
      startDateInputRef.current?.focus()
      return
    }
    if (startDate > today) {
      setDateError('La date ne peut pas être dans le futur.')
      startDateInputRef.current?.focus()
      return
    }

    setIsSaving(true)
    const saved = await onSave(startDate)
    setIsSaving(false)
    if (saved) {
      setStartDate(today)
    } else {
      startDateInputRef.current?.focus()
    }
  }

  const fieldError = dateError ?? saveError?.message ?? null

  return (
    <div className="view-stack home-layout">
      <section className="entry-section" aria-labelledby="entry-title">
        <div className="entry-copy">
          <p className="section-label">Ajouter une date</p>
          <h2 id="entry-title">Enregistrer un début de règles</h2>
          <p>Choisis aujourd’hui ou une date passée. Tes informations restent sur cet appareil.</p>
        </div>

        <form className="entry-form" noValidate onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="period-start-date">Premier jour des règles</label>
            <input
              id="period-start-date"
              name="periodStartDate"
              ref={startDateInputRef}
              type="date"
              autoComplete="off"
              value={startDate}
              max={today}
              required
              aria-invalid={dateError || saveError?.invalidDate ? 'true' : undefined}
              aria-describedby={fieldError ? 'period-start-hint period-start-error' : 'period-start-hint'}
              onChange={(event) => {
                setStartDate(event.currentTarget.value)
                if (dateError) setDateError(null)
                if (saveError) onClearSaveError()
              }}
            />
            <p id="period-start-hint" className="field-hint">
              Une date future ne peut pas être enregistrée.
            </p>
            {fieldError && (
              <p className="field-error" id="period-start-error" role="alert">
                {fieldError}
              </p>
            )}
          </div>
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Enregistrement…' : 'Enregistrer le début'}
          </button>
        </form>

        <p className="form-feedback form-feedback-success" role="status" aria-live="polite">
          {saveMessage ?? ''}
        </p>
      </section>

      {estimate.kind === 'insufficient' && periods.length > 0 && (
        <section className="forecast-empty" aria-labelledby="forecast-empty-title">
          <h2 id="forecast-empty-title">Pas encore assez de dates.</h2>
          <p>Continue à noter les débuts; une estimation apparaîtra après trois intervalles.</p>
        </section>
      )}

      {estimate.kind !== 'insufficient' && (
        <ForecastView estimate={estimate} hasFutureRecords={periods.some((period) => period.startDate > today)} />
      )}

      {latestPeriod ? (
        <section className="latest-period" aria-labelledby="latest-period-title">
          <div>
            <p className="section-label">Historique</p>
            <h2 id="latest-period-title">Dernier début enregistré</h2>
          </div>
          <time className="latest-period-date" dateTime={latestPeriod.startDate}>
            {formatCivilDate(latestPeriod.startDate)}
          </time>
          <button
            className="text-button inline-flex items-center justify-center gap-period-2"
            type="button"
            onClick={onOpenCalendar}
          >
            Ouvrir le calendrier <ChevronRight size={16} aria-hidden="true" />
          </button>
        </section>
      ) : (
        <section className="first-use-note" aria-labelledby="history-title">
          <div className="note-icon" aria-hidden="true">
            <LockKeyhole size={18} />
          </div>
          <div>
            <h2 id="history-title">Commence par une date.</h2>
            <p>Plusieurs dates seront nécessaires avant d’afficher une estimation.</p>
          </div>
        </section>
      )}
    </div>
  )
}

function formatForecastRange(earliest: CivilDate, latest: CivilDate): string {
  if (earliest.slice(0, 7) === latest.slice(0, 7)) {
    const earliestDay = Number(earliest.slice(-2))
    return `${earliestDay} au ${formatCivilDate(latest)}`
  }
  return `${formatCivilDate(earliest)} au ${formatCivilDate(latest)}`
}

function ForecastView({
  estimate,
  hasFutureRecords,
}: {
  estimate: Exclude<PeriodStartEstimate, { kind: 'insufficient' }>
  hasFutureRecords: boolean
}) {
  return (
    <section className="forecast-section" aria-labelledby="forecast-title">
      <p className="section-label">Estimation personnelle</p>
      <h2 id="forecast-title">Prochain début estimé</h2>
      <time className="forecast-date" dateTime={estimate.predictedStartDate}>
        {formatCivilDate(estimate.predictedStartDate)}
      </time>

      {estimate.kind === 'low-confidence' ? (
        <p className="forecast-method">Confiance faible. Basée sur {estimate.usedCycles} intervalles enregistrés.</p>
      ) : (
        <div className="forecast-range-details">
          <p className="forecast-range-label">Plage historique</p>
          <p className="forecast-range">{formatForecastRange(estimate.earliestStartDate, estimate.latestStartDate)}</p>
          <p className="forecast-method">Du plus court au plus long des six derniers intervalles.</p>
          <p className="forecast-method">La date centrale suit leur médiane.</p>
        </div>
      )}

      {estimate.isPast && (
        <p className="forecast-expired">La date centrale estimée est passée. Elle ne se décale pas automatiquement.</p>
      )}
      {hasFutureRecords && (
        <p className="forecast-future-note">
          Les dates après aujourd’hui restent visibles au calendrier, mais n’entrent pas dans ce calcul.
        </p>
      )}
      <p className="forecast-disclaimer">
        Cette estimation s’appuie sur tes dates; ce n’est ni une certitude ni une méthode contraceptive.
      </p>
    </section>
  )
}
