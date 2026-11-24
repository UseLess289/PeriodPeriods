import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { addCivilDays, buildCalendarMonth, shiftCalendarMonth } from '../../domain/dates'
import type { PeriodStartEstimate } from '../../domain/forecast/estimate-next-period'
import type { CivilDate, Period } from '../../domain/periods'
import { formatCivilDate } from '../shared/format-civil-date'

type PeriodCalendarViewProps = {
  periods: Period[]
  estimate: PeriodStartEstimate
  firstDayOfWeek: 0 | 1
  today: CivilDate
  onSaveDates: (dates: CivilDate[]) => Promise<string | null>
  onSelectionModeChange: (isSelecting: boolean) => void
}

function getMonthTitle(monthStart: CivilDate): string {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${monthStart}T00:00:00.000Z`))
}

function getMonthDayCount(monthStart: CivilDate): number {
  const date = new Date(`${monthStart.slice(0, 7)}-01T00:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + 1, 0)
  return date.getUTCDate()
}

function getFirstSelectableDate(
  monthStart: CivilDate,
  firstDayOfWeek: 0 | 1,
  periods: Set<CivilDate>,
  today: CivilDate,
): CivilDate | null {
  const days = buildCalendarMonth(monthStart, firstDayOfWeek)
  return (
    days.find(({ date, inDisplayedMonth }) => inDisplayedMonth && date <= today && !periods.has(date))?.date ?? null
  )
}

export function PeriodCalendarView({
  periods,
  estimate,
  firstDayOfWeek,
  today,
  onSaveDates,
  onSelectionModeChange,
}: PeriodCalendarViewProps) {
  const [monthStart, setMonthStart] = useState<CivilDate>(`${today.slice(0, 7)}-01`)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<CivilDate>>(() => new Set())
  const [focusedDate, setFocusedDate] = useState<CivilDate | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const dateButtons = useRef(new Map<CivilDate, HTMLButtonElement>())
  const addModeButtonRef = useRef<HTMLButtonElement>(null)
  const pendingFocusDate = useRef<CivilDate | null>(null)
  const shouldReturnFocusToAddButton = useRef(false)
  const monthTitle = getMonthTitle(monthStart)
  const formattedMonthTitle = `${monthTitle[0].toLocaleUpperCase('fr-FR')}${monthTitle.slice(1)}`
  const calendarDays = buildCalendarMonth(monthStart, firstDayOfWeek)
  const recordedStarts = new Set(periods.map(({ startDate }) => startDate))
  const monthPeriodStarts = new Set(
    periods.filter((period) => period.startDate.startsWith(monthStart.slice(0, 7))).map((period) => period.startDate),
  )
  const orderedSelection = [...selectedDates].sort()
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const weekday = (firstDayOfWeek + index) % 7
    const date = new Date('2023-01-01T00:00:00.000Z')
    date.setUTCDate(date.getUTCDate() + weekday)
    return {
      longName: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' }).format(date),
      shortName: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date),
    }
  })

  useEffect(() => {
    onSelectionModeChange(isAdding)
    return () => onSelectionModeChange(false)
  }, [isAdding, onSelectionModeChange])

  useEffect(() => {
    if (!pendingFocusDate.current) return
    dateButtons.current.get(pendingFocusDate.current)?.focus()
    pendingFocusDate.current = null
  }, [focusedDate, monthStart])

  useEffect(() => {
    if (isAdding || !shouldReturnFocusToAddButton.current) return
    addModeButtonRef.current?.focus()
    shouldReturnFocusToAddButton.current = false
  }, [isAdding])

  function enterAddingMode() {
    setSelectedDates(new Set())
    setSaveError(null)
    setSaveMessage('')
    const firstSelectableDate = getFirstSelectableDate(monthStart, firstDayOfWeek, recordedStarts, today)
    setFocusedDate(firstSelectableDate)
    pendingFocusDate.current = firstSelectableDate
    shouldReturnFocusToAddButton.current = false
    setIsAdding(true)
  }

  function changeMonth(offset: number) {
    const nextMonth = shiftCalendarMonth(monthStart, offset)
    setMonthStart(nextMonth)
    if (isAdding) setFocusedDate(getFirstSelectableDate(nextMonth, firstDayOfWeek, recordedStarts, today))
  }

  function leaveAddingMode(message = '') {
    setIsAdding(false)
    setSelectedDates(new Set())
    setFocusedDate(null)
    setSaveError(null)
    setSaveMessage(message)
    shouldReturnFocusToAddButton.current = true
  }

  function toggleDate(date: CivilDate) {
    setSelectedDates((current) => {
      const next = new Set(current)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
    setSaveError(null)
    setSaveMessage('')
  }

  async function saveSelectedDates() {
    if (orderedSelection.length === 0 || isSaving) return
    setIsSaving(true)
    setSaveError(null)
    setSaveMessage('')
    const error = await onSaveDates(orderedSelection)
    setIsSaving(false)
    if (error) {
      setSaveError(error)
      return
    }
    leaveAddingMode(
      `${orderedSelection.length} début${orderedSelection.length === 1 ? '' : 's'} enregistré${orderedSelection.length === 1 ? '' : 's'} sur cet appareil.`,
    )
  }

  function focusSelectableDate(target: CivilDate, direction: -1 | 1) {
    let date = target
    for (let attempt = 0; attempt < 370; attempt += 1) {
      if (date > today) return
      if (!recordedStarts.has(date)) {
        pendingFocusDate.current = date
        setFocusedDate(date)
        setMonthStart(`${date.slice(0, 7)}-01`)
        return
      }
      date = addCivilDays(date, direction)
    }
  }

  function handleSelectionKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: CivilDate) {
    let target: CivilDate | null = null
    let direction: -1 | 1 = 1
    if (event.key === 'ArrowRight') target = addCivilDays(date, 1)
    if (event.key === 'ArrowLeft') {
      target = addCivilDays(date, -1)
      direction = -1
    }
    if (event.key === 'ArrowDown') target = addCivilDays(date, 7)
    if (event.key === 'ArrowUp') {
      target = addCivilDays(date, -7)
      direction = -1
    }
    if (event.key === 'Home' || event.key === 'End') {
      const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay()
      const offset = (weekday - firstDayOfWeek + 7) % 7
      target = addCivilDays(date, event.key === 'Home' ? -offset : 6 - offset)
      if (event.key === 'Home') direction = -1
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      const shiftedMonth = shiftCalendarMonth(date, event.key === 'PageUp' ? -1 : 1)
      const shiftedDay = Math.min(Number(date.slice(-2)), getMonthDayCount(shiftedMonth))
      target = `${shiftedMonth.slice(0, 7)}-${shiftedDay.toString().padStart(2, '0')}`
      if (target > today) {
        target = today
        direction = -1
      }
    }

    if (target) {
      event.preventDefault()
      focusSelectableDate(target, direction)
    }
  }

  return (
    <section className="calendar-section" aria-labelledby="calendar-month-title">
      <div className="calendar-heading">
        <div>
          <p className="section-label">Dates enregistrées</p>
          <h2 id="calendar-month-title" aria-live="polite" aria-atomic="true">
            {formattedMonthTitle}
          </h2>
        </div>
        <div className="month-navigation">
          <button
            className="month-nav-button"
            type="button"
            aria-label="Mois précédent"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button className="month-nav-button" type="button" aria-label="Mois suivant" onClick={() => changeMonth(1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!isAdding ? (
        <div className="calendar-add-action">
          <button className="secondary-button" ref={addModeButtonRef} type="button" onClick={enterAddingMode}>
            Ajouter plusieurs débuts
          </button>
        </div>
      ) : (
        <div className="calendar-selection-panel" aria-labelledby="calendar-selection-title">
          <div>
            <h3 id="calendar-selection-title">Ajouter plusieurs débuts</h3>
            <p>Choisis chaque date séparément; aucune plage continue ne sera sélectionnée.</p>
            <p className="field-hint">Les dates futures et les débuts déjà enregistrés sont désactivés.</p>
            <p className="selection-count" aria-live="polite" aria-atomic="true">
              {orderedSelection.length} début{orderedSelection.length === 1 ? '' : 's'} sélectionné
              {orderedSelection.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="calendar-selection-actions">
            <button className="secondary-button" type="button" disabled={isSaving} onClick={() => leaveAddingMode()}>
              Annuler
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={orderedSelection.length === 0 || isSaving}
              onClick={saveSelectedDates}
            >
              {isSaving
                ? 'Enregistrement…'
                : `Enregistrer ${orderedSelection.length} début${orderedSelection.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      <table className="calendar-table" aria-label={`Calendrier pour ${monthTitle}`}>
        <thead>
          <tr>
            {weekDays.map(({ longName, shortName }) => (
              <th key={longName} scope="col" aria-label={longName}>
                {shortName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: calendarDays.length / 7 }, (_, weekIndex) => (
            <tr key={calendarDays[weekIndex * 7].date}>
              {calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
                const dayNumber = Number(day.date.slice(-2))
                const hasPeriodStart = monthPeriodStarts.has(day.date)
                const isFutureStart = hasPeriodStart && day.date > today
                const isFuture = day.date > today
                const isSelected = selectedDates.has(day.date)
                const isForecastCenter = estimate.kind !== 'insufficient' && day.date === estimate.predictedStartDate
                const isForecastRange =
                  estimate.kind === 'range' &&
                  day.date >= estimate.earliestStartDate &&
                  day.date <= estimate.latestStartDate
                const isForecastLowerBound = estimate.kind === 'range' && day.date === estimate.earliestStartDate
                const isForecastUpperBound = estimate.kind === 'range' && day.date === estimate.latestStartDate
                const dateDescriptions = [
                  ...(hasPeriodStart
                    ? [isFutureStart ? 'Début enregistré pour une date à venir' : 'Début enregistré']
                    : []),
                  ...(isForecastLowerBound ? ['Borne basse de la plage estimée'] : []),
                  ...(isForecastUpperBound ? ['Borne haute de la plage estimée'] : []),
                  ...(isForecastCenter ? ['Date centrale estimée'] : []),
                  ...(isForecastRange && !isForecastCenter && !isForecastLowerBound && !isForecastUpperBound
                    ? ['Dans la plage estimée']
                    : []),
                  ...(estimate.kind !== 'insufficient' && estimate.isPast && isForecastCenter
                    ? ['Estimation passée']
                    : []),
                ]
                const unavailableReason = hasPeriodStart
                  ? 'début déjà enregistré, non sélectionnable'
                  : isFuture
                    ? 'date future, non sélectionnable'
                    : ''

                return (
                  <td
                    key={day.date}
                    className={[
                      day.inDisplayedMonth ? '' : 'is-outside-month',
                      day.date === today ? 'is-today' : '',
                      hasPeriodStart ? 'has-period-start' : '',
                      isFutureStart ? 'is-future-start' : '',
                      isForecastRange ? 'is-estimated-range' : '',
                      isForecastCenter ? 'is-estimated-center' : '',
                      isForecastLowerBound || isForecastUpperBound ? 'is-estimated-bound' : '',
                      estimate.kind !== 'insufficient' && estimate.isPast && isForecastCenter ? 'is-estimate-past' : '',
                      isAdding && isSelected ? 'is-selected-for-addition' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden={day.inDisplayedMonth ? undefined : 'true'}
                  >
                    {day.inDisplayedMonth &&
                      (isAdding ? (
                        <button
                          className="calendar-date-choice"
                          ref={(element) => {
                            if (element) dateButtons.current.set(day.date, element)
                            else dateButtons.current.delete(day.date)
                          }}
                          type="button"
                          aria-label={`${formatCivilDate(day.date)}${isSelected ? ', sélectionnée' : ''}${unavailableReason ? `, ${unavailableReason}` : ''}`}
                          aria-pressed={isSelected}
                          disabled={Boolean(unavailableReason)}
                          tabIndex={focusedDate === day.date ? 0 : -1}
                          onClick={() => toggleDate(day.date)}
                          onKeyDown={(event) => handleSelectionKeyDown(event, day.date)}
                        >
                          <span className="calendar-day-number">{dayNumber}</span>
                          <span className="calendar-selection-check" aria-hidden="true">
                            {isSelected ? '✓' : ''}
                          </span>
                        </button>
                      ) : (
                        <time
                          dateTime={day.date}
                          aria-current={day.date === today ? 'date' : undefined}
                          aria-label={
                            dateDescriptions.length > 0
                              ? `${dateDescriptions.join(' et ')} le ${formatCivilDate(day.date)}`
                              : formatCivilDate(day.date)
                          }
                        >
                          <span className="calendar-day-number">{dayNumber}</span>
                          <span className="calendar-markers" aria-hidden="true">
                            {isForecastRange && <span className="forecast-range-mark" />}
                            {isForecastCenter && <span className="forecast-center-mark" />}
                            {(isForecastLowerBound || isForecastUpperBound) && <span className="forecast-bound-mark" />}
                          </span>
                        </time>
                      ))}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {saveError && (
        <p className="field-error calendar-save-error" role="alert">
          {saveError}
        </p>
      )}
      <p className="form-feedback form-feedback-success" role="status" aria-live="polite" aria-atomic="true">
        {saveMessage}
      </p>

      <ul className="calendar-legend" aria-label="Légende du calendrier">
        {today.slice(0, 7) === monthStart.slice(0, 7) && (
          <li>
            <span className="calendar-today-mark" aria-hidden="true" />
            Aujourd’hui
          </li>
        )}
        <li>
          <span className="period-start-mark" aria-hidden="true" />
          Début enregistré
        </li>
        {estimate.kind === 'range' && (
          <>
            <li>
              <span className="forecast-range-mark" aria-hidden="true" />
              Plage estimée
            </li>
            <li>
              <span className="forecast-bound-mark" aria-hidden="true" />
              Bornes basse et haute
            </li>
          </>
        )}
        {estimate.kind !== 'insufficient' && (
          <li>
            <span className="forecast-center-mark" aria-hidden="true" />
            Date centrale estimée
          </li>
        )}
      </ul>

      {monthPeriodStarts.size === 0 && !isAdding && (
        <div className="calendar-empty-note">
          <p>Aucune date de début enregistrée pour ce mois.</p>
        </div>
      )}
    </section>
  )
}
