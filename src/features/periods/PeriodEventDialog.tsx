import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
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
  const dialogTitle = useRef<HTMLHeadingElement>(null)
  const startDateInput = useRef<HTMLInputElement>(null)
  const trackingDetails = useRef<HTMLDetailsElement>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 30rem)').matches === true,
  )
  const todayEntry = periods.find((period) => period.startDate === today)
  const [startDate, setStartDate] = useState(today)
  const saveButton = useRef<HTMLButtonElement>(null)
  const [durationDays, setDuration] = useState(() =>
    todayEntry ? getPeriodDuration(todayEntry) : DEFAULT_PERIOD_DURATION,
  )
  const [dailyLogs, setDailyLogs] = useState<PeriodDay[]>(() => todayEntry?.dailyLogs ?? [])
  const [activeDay, setActiveDay] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [dateError, setDateError] = useState(false)
  const errorMessage = error && locale === 'en' ? (englishErrors.get(error) ?? error) : error
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 30rem)')
    if (!media) return

    const updateViewport = () => setIsMobileViewport(media.matches)
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])

  useLayoutEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      element.showModal()
      if (form.current) form.current.scrollTop = 0
      trackingDetails.current?.removeAttribute('open')
      if (isMobileViewport) dialogTitle.current?.focus({ preventScroll: true })
      else saveButton.current?.focus({ preventScroll: true })
    }
    if (!open && element.open) element.close()
  }, [isMobileViewport, open])

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
    setDateError(false)
  }

  function close() {
    if (saving) return
    changeStart(today)
    onClose()
  }

  function keepFocusInDialog(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab' || !dialog.current) return

    const focusable = Array.from(
      dialog.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
    const first = focusable[0]
    const last = focusable.at(-1)
    const active = document.activeElement

    if (!first || !last) return
    if (event.shiftKey && (active === first || !focusable.includes(active as HTMLElement))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !dialog.current.contains(active))) {
      event.preventDefault()
      first.focus()
    }
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
    if (!startDate || startDate > today) {
      setDateError(true)
      setError(
        !startDate
          ? text('Indique une date de début.', 'Choose a start date.')
          : text('Choisis une date qui ne dépasse pas aujourd’hui.', 'Choose today or an earlier date.'),
      )
      requestAnimationFrame(() => startDateInput.current?.focus())
      return
    }
    if (!Number.isSafeInteger(durationDays) || durationDays < minimumDuration) {
      setDateError(false)
      setError(text('Vérifie la durée choisie.', 'Check the selected duration.'))
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
      setDateError(issue === 'Une date future ne peut pas être enregistrée.')
      setError(issue)
      requestAnimationFrame(() => {
        if (issue === 'Une date future ne peut pas être enregistrée.') {
          startDateInput.current?.focus()
        } else {
          saveButton.current?.focus()
        }
      })
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

  function renderDayTracking() {
    return dayCount > 0 ? (
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
      </>
    ) : (
      <p className="field-hint">
        {text('Choisis une date de début pour renseigner le suivi.', 'Choose a start date to log observations.')}
      </p>
    )
  }

  const errorRegion = (
    <p
      id="event-form-error"
      role="alert"
      aria-live="assertive"
      className={errorMessage ? 'field-error' : 'visually-hidden'}
    >
      {errorMessage ?? ''}
    </p>
  )

  return (
    <dialog
      ref={dialog}
      lang={locale}
      className="event-dialog"
      data-has-error={Boolean(errorMessage)}
      aria-labelledby="event-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === dialog.current) close()
      }}
      onKeyDown={keepFocusInDialog}
    >
      <form id="period-event-form" ref={form} onSubmit={submit} noValidate>
        <div className="event-dialog-heading">
          <h2 id="event-dialog-title" ref={dialogTitle} tabIndex={-1}>
            {existing
              ? text('Compléter une période', 'Edit period details')
              : text('Enregistrer une période', 'Record a period')}
          </h2>
          <button className="text-button" type="button" disabled={saving} onClick={close}>
            {text('Annuler', 'Cancel')}
          </button>
        </div>
        <div className="event-dialog-content">
          <div className="event-tile event-start-tile">
            <label htmlFor="event-start">{text('Début des règles', 'Period start')}</label>
            <input
              id="event-start"
              ref={startDateInput}
              type="date"
              required
              max={today}
              value={startDate}
              aria-invalid={dateError || undefined}
              aria-describedby={dateError ? 'event-form-error' : undefined}
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
              onChange={(event) => {
                setDuration(event.target.valueAsNumber)
                setError(null)
              }}
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
              'Choisis une intensité de 1 à 3, ou « Non renseigné ». Pour la molette, défile ou utilise les touches fléchées.',
              'Choose an intensity from 1 to 3, or “Not logged”. For the wheel, scroll or use the arrow keys.',
            )}
          </p>
          {isMobileViewport ? (
            <details className="event-details" ref={trackingDetails}>
              <summary className="event-details-summary">
                <span>{text('Suivi par jour', 'Daily details')}</span>
                <span className="event-details-optional">{text('Facultatif', 'Optional')}</span>
              </summary>
              <div className="event-details-content">{renderDayTracking()}</div>
            </details>
          ) : (
            renderDayTracking()
          )}
          {Boolean(existing?.symptoms?.length) && (
            <p className="event-legacy-symptoms field-hint">
              {text('Anciens symptômes :', 'Previous symptoms:')} {existing?.symptoms?.join(', ')}
            </p>
          )}
          {!isMobileViewport && errorRegion}
        </div>
      </form>
      {isMobileViewport && <div className="event-dialog-actions">{errorRegion}</div>}
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
