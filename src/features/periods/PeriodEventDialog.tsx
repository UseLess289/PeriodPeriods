import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { addCivilDays } from '../../domain/dates'
import {
  DEFAULT_PERIOD_DURATION,
  daysBetweenCivilDates,
  getPeriodDuration,
  pickDailyIntensities,
} from '../../domain/periods'
import type { CivilDate, DailyIntensity, Intensity, NewPeriod, Period, PeriodDay } from '../../domain/periods'
import { formatCivilDate } from '../shared/format-civil-date'
import type { Locale } from '../shared/format-civil-date'
import { IntensityWheel } from './IntensityWheel'

type Props = {
  readonly locale?: Locale
  open: boolean
  today: CivilDate
  periods: readonly Period[]
  onClose: () => void
  onSave: (event: NewPeriod) => Promise<string | null>
}

// Includes the known errors returned by the app's save callback.
const englishErrors = new Map([
  ['Une date future ne peut pas être enregistrée.', 'A future date cannot be recorded.'],
  ['L’enregistrement a échoué. Vérifie les données et réessaie.', 'Could not save. Check the details and try again.'],
])

export function PeriodEventDialog({ open, today, periods, onClose, onSave, locale = 'fr' }: Props) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const dialog = useRef<HTMLDialogElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const todayEntry = periods.find((period) => period.startDate === today)
  const [startDate, setStartDate] = useState(today)
  const saveButton = useRef<HTMLButtonElement>(null)
  const [durationDays, setDuration] = useState(() =>
    todayEntry ? getPeriodDuration(todayEntry) : DEFAULT_PERIOD_DURATION,
  )
  const [dailyLogs, setDailyLogs] = useState<PeriodDay[]>(() => todayEntry?.dailyLogs ?? [])
  const [activeDay, setActiveDay] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const errorMessage = error && locale === 'en' ? (englishErrors.get(error) ?? error) : error
  const [saving, setSaving] = useState(false)

  useLayoutEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      saveButton.current?.setAttribute('autofocus', '')
      element.showModal()
      if (form.current) form.current.scrollTop = 0
    }
    if (!open && element.open) element.close()
  }, [open])

  const existing = periods.find((period) => period.startDate === startDate)
  const minimumDuration = Math.max(1, ...dailyLogs.map(({ day }) => day))
  const maximumDuration = Math.max(14, existing ? getPeriodDuration(existing) : 1)
  const elapsedDays =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate <= today ? daysBetweenCivilDates(startDate, today) + 1 : 0
  const dayCount = Math.min(366, Number.isSafeInteger(durationDays) ? durationDays : 0, elapsedDays)
  const selectedDay = Math.min(activeDay, dayCount)
  const dailyLog = dailyLogs.find(({ day }) => day === selectedDay)
  const metrics: { key: DailyIntensity; label: string; legacy?: string }[] = [
    {
      key: 'flowIntensity',
      label: text('Flux', 'Flow'),
      legacy:
        dailyLog?.flow &&
        { light: text('Léger', 'Light'), medium: text('Moyen', 'Medium'), heavy: text('Abondant', 'Heavy') }[
          dailyLog.flow
        ],
    },
    {
      key: 'headacheIntensity',
      label: text('Maux de tête', 'Headache'),
      legacy:
        dailyLog?.headache === undefined
          ? undefined
          : dailyLog.headache
            ? text('Présents', 'Present')
            : text('Absents', 'Absent'),
    },
    { key: 'crampsIntensity', label: text('Crampes', 'Cramps') },
    { key: 'fatigueIntensity', label: text('Fatigue', 'Fatigue') },
  ]

  function changeStart(value: string) {
    setStartDate(value)
    const period = periods.find((item) => item.startDate === value)
    setDuration(period ? getPeriodDuration(period) : DEFAULT_PERIOD_DURATION)
    setDailyLogs(period?.dailyLogs ?? [])
    setActiveDay(1)
    setError(null)
  }

  function close() {
    if (saving) return
    changeStart(today)
    onClose()
  }

  function updateDay(metric: DailyIntensity, value: Intensity | undefined) {
    setDailyLogs((logs) => {
      const entry = { ...logs.find(({ day }) => day === selectedDay), day: selectedDay, [metric]: value }
      if (metric === 'flowIntensity') delete entry.flow
      if (metric === 'headacheIntensity') delete entry.headache
      const hasObservations =
        entry.flow !== undefined || entry.headache !== undefined || Object.keys(pickDailyIntensities(entry)).length > 0
      return [...logs.filter(({ day }) => day !== selectedDay), ...(hasObservations ? [entry] : [])].sort(
        (left, right) => left.day - right.day,
      )
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!startDate || startDate > today || !Number.isSafeInteger(durationDays) || durationDays < minimumDuration) {
      setError(text('Vérifie la date de début et la durée.', 'Check the start date and duration.'))
      return
    }
    setSaving(true)
    const issue = await onSave({
      startDate,
      durationDays,
      dailyLogs,
      symptoms: existing?.symptoms,
    })
    setSaving(false)
    if (issue) {
      setError(issue)
      return
    }
    const todayPeriod = startDate === today ? { durationDays, dailyLogs } : null
    changeStart(today)
    if (todayPeriod) {
      setDuration(todayPeriod.durationDays)
      setDailyLogs(todayPeriod.dailyLogs)
    }
    onClose()
  }

  return (
    <dialog
      ref={dialog}
      lang={locale}
      className="event-dialog"
      aria-labelledby="event-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === dialog.current) close()
      }}
    >
      <form id="period-event-form" ref={form} onSubmit={submit}>
        <div className="event-dialog-heading">
          <h2 id="event-dialog-title">
            {existing
              ? text('Compléter une période', 'Edit period details')
              : text('Enregistrer une période', 'Record a period')}
          </h2>
          <button className="text-button" type="button" disabled={saving} onClick={close}>
            {text('Annuler', 'Cancel')}
          </button>
        </div>
        <div className="event-tile event-start-tile">
          <label htmlFor="event-start">{text('Début des règles', 'Period start')}</label>
          <input
            id="event-start"
            type="date"
            required
            max={today}
            value={startDate}
            onChange={(event) => changeStart(event.target.value)}
          />
        </div>
        <div className="event-tile event-duration-tile">
          <div className="event-duration-heading">
            <label htmlFor="event-duration">{text('Durée (jours)', 'Duration (days)')}</label>
            <span aria-hidden="true">
              {durationDays} {text(durationDays === 1 ? 'jour' : 'jours', durationDays === 1 ? 'day' : 'days')}
            </span>
          </div>
          <input
            id="event-duration"
            type="range"
            min={minimumDuration}
            max={maximumDuration}
            value={durationDays}
            onChange={(event) => setDuration(event.target.valueAsNumber)}
          />
          <div className="event-duration-endpoints" aria-hidden="true">
            <span>{minimumDuration}</span>
            <span>{maximumDuration}</span>
          </div>
          {minimumDuration > 1 && (
            <p className="field-hint">
              {text(
                'La durée minimale inclut les jours déjà renseignés.',
                'The minimum duration includes days you’ve already logged.',
              )}
            </p>
          )}
        </div>
        <p id="event-intensity-hint" className="visually-hidden">
          {text(
            'Les molettes se règlent de 1 à 3 avec le défilement ou les touches fléchées. Zéro signifie non renseigné.',
            'Set each wheel from 1 to 3 by scrolling or using the arrow keys. Zero means not logged.',
          )}
        </p>
        {dayCount > 0 ? (
          <>
            <div className="event-day-heading">
              <label htmlFor="event-day">{text('Jour de la période', 'Day of the period')}</label>
              <select id="event-day" value={selectedDay} onChange={(event) => setActiveDay(Number(event.target.value))}>
                {Array.from({ length: dayCount }, (_, index) => (
                  <option key={index} value={index + 1}>
                    {text(`Jour ${index + 1}`, `Day ${index + 1}`)} –{' '}
                    {formatCivilDate(addCivilDays(startDate, index), locale)}
                  </option>
                ))}
              </select>
            </div>
            {open && (
              <div className="event-intensity-grid">
                {metrics.map(({ key, label, legacy }) => (
                  <IntensityWheel
                    key={`${startDate}-${selectedDay}-${key}`}
                    id={`event-${key}`}
                    label={label}
                    value={dailyLog?.[key]}
                    emptyLabel={text('Non renseigné', 'Not logged')}
                    previousValue={legacy ? text(`Ancien suivi : ${legacy}`, `Previous log: ${legacy}`) : undefined}
                    onChange={(value) => updateDay(key, value)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="field-hint">
            {text('Choisis une date de début pour renseigner le suivi.', 'Choose a start date to log observations.')}
          </p>
        )}
        {Boolean(existing?.symptoms?.length) && (
          <p className="field-hint">
            {text('Anciens symptômes :', 'Previous symptoms:')} {existing?.symptoms?.join(', ')}
          </p>
        )}
        {errorMessage && (
          <p role="alert" className="field-error">
            {errorMessage}
          </p>
        )}
      </form>
      <button
        ref={saveButton}
        className="floating-add event-save"
        type="submit"
        form="period-event-form"
        disabled={saving}
      >
        {saving ? text('Enregistrement…', 'Saving…') : text('Enregistrer', 'Save')}
      </button>
    </dialog>
  )
}
