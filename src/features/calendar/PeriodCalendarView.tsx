import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { addCivilDays, buildCalendarMonth, shiftCalendarMonth } from '../../domain/dates'
import { cyclePhaseNames, estimateCyclePhaseRanges } from '../../domain/forecast/estimate-cycle-phases'
import type { CivilDateRange, CyclePhaseName } from '../../domain/forecast/estimate-cycle-phases'
import type { PeriodStartEstimate } from '../../domain/forecast/estimate-next-period'
import { daysBetweenCivilDates, getPeriodDuration } from '../../domain/periods'
import type { CivilDate, Period } from '../../domain/periods'
import { formatCivilDate, formatCivilMonth, getCalendarWeekdays, type Locale } from '../shared/format-civil-date'

const phaseLabels: Record<CyclePhaseName, { fr: string; en: string }> = {
  menstrual: { fr: 'Règles', en: 'Menstrual' },
  follicular: { fr: 'Phase folliculaire', en: 'Follicular' },
  ovulatory: { fr: 'Ovulation', en: 'Ovulation' },
  luteal: { fr: 'Phase lutéale', en: 'Luteal' },
}

const estimatedPhaseDescriptions: Record<CyclePhaseName, { fr: string; en: string }> = {
  menstrual: { fr: 'Règles estimées', en: 'Estimated menstrual phase' },
  follicular: { fr: 'Phase folliculaire estimée', en: 'Estimated follicular phase' },
  ovulatory: { fr: 'Pic d’ovulation estimé', en: 'Estimated ovulation peak' },
  luteal: { fr: 'Phase lutéale estimée', en: 'Estimated luteal phase' },
}

function dateIsInRange(range: CivilDateRange | null, date: CivilDate): boolean {
  return range !== null && date >= range.startDate && date <= range.endDate
}

function phaseDescription(phase: CyclePhaseName, possible: boolean, locale: Locale): string {
  const label = phaseLabels[phase][locale]
  if (possible)
    return locale === 'en' ? `Possible ${label.toLowerCase()} date` : `Date possible : ${label.toLowerCase()}`
  return estimatedPhaseDescriptions[phase][locale]
}

type PeriodCalendarViewProps = {
  readonly locale?: Locale
  periods: Period[]
  estimate: PeriodStartEstimate
  firstDayOfWeek: 0 | 1
  today: CivilDate
  onSaveDates: (dates: CivilDate[]) => Promise<string | null>
}

type MonthSwipeGesture = {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastTime: number
  velocityX: number
  isHorizontal: boolean
  startedOnDateChoice: boolean
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

// The app's save callback still returns these French messages.
const englishSaveErrors = new Map([
  [
    'Les dates futures ne peuvent pas être enregistrées. Aucune date n’a été ajoutée.',
    'Future dates cannot be saved. No dates were added.',
  ],
  [
    'Au moins un de ces débuts est déjà enregistré. Aucune date n’a été ajoutée; vérifie la sélection.',
    'At least one period start is already recorded. No dates were added. Check your selection.',
  ],
  [
    'L’enregistrement a échoué. Aucune date n’a été ajoutée; tes sélections sont conservées. Réessaie.',
    'Could not save. No dates were added, and your selections are still in place. Try again.',
  ],
])

export function PeriodCalendarView({
  periods,
  estimate,
  firstDayOfWeek,
  today,
  onSaveDates,
  locale = 'fr',
}: PeriodCalendarViewProps) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const [monthStart, setMonthStart] = useState<CivilDate>(`${today.slice(0, 7)}-01`)
  const [monthDirection, setMonthDirection] = useState<-1 | 1>(1)
  const [hasChangedMonth, setHasChangedMonth] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<CivilDate>>(() => new Set())
  const [focusedDate, setFocusedDate] = useState<CivilDate | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const dateButtons = useRef(new Map<CivilDate, HTMLButtonElement>())
  const addModeButtonRef = useRef<HTMLButtonElement>(null)
  const pendingFocusDate = useRef<CivilDate | null>(null)
  const shouldReturnFocusToAddButton = useRef(false)
  const monthSwipeGestureRef = useRef<MonthSwipeGesture | null>(null)
  const calendarTableRef = useRef<HTMLTableElement>(null)
  const swipeSettleTimerRef = useRef<number | null>(null)
  const suppressDateChoiceClickRef = useRef(false)
  const monthTitle = formatCivilMonth(monthStart, locale)
  const formattedMonthTitle = `${monthTitle[0].toLocaleUpperCase(locale)}${monthTitle.slice(1)}`
  const calendarDays = buildCalendarMonth(monthStart, firstDayOfWeek)
  const recordedStarts = new Set(periods.map(({ startDate }) => startDate))
  const displayedDays = calendarDays.filter((day) => day.inDisplayedMonth)
  const firstDisplayed = displayedDays[0].date
  const lastDisplayed = displayedDays[displayedDays.length - 1].date
  const recordedSpans = periods
    .filter((period) => period.startDate <= lastDisplayed)
    .map((period) => ({ start: period.startDate, duration: getPeriodDuration(period) }))
    .filter(({ start, duration }) => start >= firstDisplayed || daysBetweenCivilDates(start, firstDisplayed) < duration)
  const monthPeriodStarts = new Set(
    periods.filter((period) => period.startDate.startsWith(monthStart.slice(0, 7))).map((period) => period.startDate),
  )
  const phaseRanges = estimate.kind === 'insufficient' ? null : estimateCyclePhaseRanges(periods, estimate, today)
  const orderedSelection = [...selectedDates].sort()
  const weekDays = getCalendarWeekdays(firstDayOfWeek, locale)
  const count = orderedSelection.length
  const selection = text(`${count} début${count === 1 ? '' : 's'}`, `${count} period start${count === 1 ? '' : 's'}`)
  const monthNavigation = {
    previous: text('Mois précédent', 'Previous month'),
    next: text('Mois suivant', 'Next month'),
  }
  const todayLabel = text('Aujourd’hui', 'Today')
  const recordedLabel = text('Début enregistré', 'Recorded period start')
  const centerLabel = text('Date centrale estimée', 'Central estimate')
  const addLabel = text('Ajouter plusieurs débuts', 'Add multiple period starts')
  const saveMessage =
    savedCount === 0
      ? ''
      : text(
          `${savedCount} début${savedCount === 1 ? '' : 's'} enregistré${savedCount === 1 ? '' : 's'} sur cet appareil.`,
          `${savedCount} period start${savedCount === 1 ? '' : 's'} saved on this device.`,
        )

  useEffect(() => {
    if (!pendingFocusDate.current) return
    dateButtons.current.get(pendingFocusDate.current)?.focus()
    pendingFocusDate.current = null
  }, [focusedDate, monthStart])

  useEffect(
    () => () => {
      if (swipeSettleTimerRef.current !== null) window.clearTimeout(swipeSettleTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (isAdding || !shouldReturnFocusToAddButton.current) return
    addModeButtonRef.current?.focus()
    shouldReturnFocusToAddButton.current = false
  }, [isAdding])

  function enterAddingMode() {
    setSelectedDates(new Set())
    setSaveError(null)
    setSavedCount(0)
    const firstSelectableDate = getFirstSelectableDate(monthStart, firstDayOfWeek, recordedStarts, today)
    setFocusedDate(firstSelectableDate)
    pendingFocusDate.current = firstSelectableDate
    shouldReturnFocusToAddButton.current = false
    setIsAdding(true)
  }

  function showMonth(nextMonth: CivilDate) {
    if (nextMonth === monthStart) return
    setHasChangedMonth(true)
    setMonthDirection(nextMonth > monthStart ? 1 : -1)
    setMonthStart(nextMonth)
    if (isAdding) setFocusedDate(getFirstSelectableDate(nextMonth, firstDayOfWeek, recordedStarts, today))
  }

  function changeMonth(offset: number) {
    const nextMonth = shiftCalendarMonth(monthStart, offset)
    showMonth(nextMonth)
  }

  function goToToday() {
    showMonth(`${today.slice(0, 7)}-01`)
  }

  function handleMonthPointerDown(event: ReactPointerEvent<HTMLTableElement>) {
    if (event.pointerType === 'mouse' || event.button !== 0 || isSaving) return

    const target = event.target instanceof Element ? event.target : null
    const startedOnDateChoice = Boolean(target?.closest('.calendar-date-choice'))
    if (
      target?.closest('button, a, input, select, textarea, summary, [role="button"], [contenteditable="true"]') &&
      !startedOnDateChoice
    ) {
      return
    }

    if (swipeSettleTimerRef.current !== null) {
      window.clearTimeout(swipeSettleTimerRef.current)
      swipeSettleTimerRef.current = null
    }
    calendarTableRef.current?.parentElement?.getAnimations().forEach((animation) => animation.cancel())
    if (calendarTableRef.current) {
      calendarTableRef.current.classList.remove('is-dragging', 'is-settling')
      calendarTableRef.current.style.transform = ''
    }

    monthSwipeGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocityX: 0,
      isHorizontal: false,
      startedOnDateChoice,
    }
    event.stopPropagation()

    try {
      const captureTarget = event.target instanceof HTMLElement ? event.target : event.currentTarget
      captureTarget.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic pointer events and browsers without pointer capture still use the same intent checks.
    }
  }

  function handleMonthPointerMove(event: ReactPointerEvent<HTMLTableElement>) {
    const gesture = monthSwipeGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (!gesture.isHorizontal) {
      if (absY >= 10 && absY > absX * 1.1) {
        monthSwipeGestureRef.current = null
        return
      }
      if (absX < 12 || absX < absY * 1.3) return
      gesture.isHorizontal = true
    }

    event.preventDefault()
    event.stopPropagation()

    const table = calendarTableRef.current
    if (table) {
      table.classList.add('is-dragging')
      table.style.transform = `translate3d(${deltaX}px, 0, 0)`
    }

    const elapsed = Math.max(1, event.timeStamp - gesture.lastTime)
    gesture.velocityX = ((event.clientX - gesture.lastX) / elapsed) * 1000
    gesture.lastX = event.clientX
    gesture.lastTime = event.timeStamp

    if (gesture.startedOnDateChoice) suppressDateChoiceClickRef.current = true
  }

  function finishMonthSwipe(event: ReactPointerEvent<HTMLTableElement>) {
    const gesture = monthSwipeGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    monthSwipeGestureRef.current = null
    if (!gesture.isHorizontal) return

    event.preventDefault()
    event.stopPropagation()

    const deltaX = event.clientX - gesture.startX
    const projectedDelta = deltaX + gesture.velocityX * 0.12
    const shouldChangeMonth = Math.abs(deltaX) >= 56 || (Math.abs(deltaX) >= 12 && Math.abs(projectedDelta) >= 56)

    if (shouldChangeMonth) changeMonth(projectedDelta < 0 ? 1 : -1)
    else settleMonthSwipe()

    if (gesture.startedOnDateChoice) {
      suppressDateChoiceClickRef.current = true
      window.setTimeout(() => {
        suppressDateChoiceClickRef.current = false
      }, 0)
    }
  }

  function cancelMonthSwipe(event: ReactPointerEvent<HTMLTableElement>) {
    if (monthSwipeGestureRef.current?.pointerId !== event.pointerId) return
    monthSwipeGestureRef.current = null
    settleMonthSwipe()
  }

  function settleMonthSwipe() {
    const table = calendarTableRef.current
    if (!table || !table.classList.contains('is-dragging')) return

    table.classList.remove('is-dragging')
    table.classList.add('is-settling')
    table.style.transform = ''

    if (swipeSettleTimerRef.current !== null) window.clearTimeout(swipeSettleTimerRef.current)
    swipeSettleTimerRef.current = window.setTimeout(() => {
      table.classList.remove('is-settling')
      swipeSettleTimerRef.current = null
    }, 180)
  }

  function preventDateClickAfterSwipe(event: ReactMouseEvent<HTMLTableElement>) {
    if (!suppressDateChoiceClickRef.current) return
    const target = event.target instanceof Element ? event.target : null
    if (!target?.closest('.calendar-date-choice')) return

    event.preventDefault()
    event.stopPropagation()
    suppressDateChoiceClickRef.current = false
  }

  function leaveAddingMode(saved = 0) {
    setIsAdding(false)
    setSelectedDates(new Set())
    setFocusedDate(null)
    setSaveError(null)
    setSavedCount(saved)
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
    setSavedCount(0)
  }

  async function saveSelectedDates() {
    if (orderedSelection.length === 0 || isSaving) return
    setIsSaving(true)
    setSaveError(null)
    setSavedCount(0)
    const error = await onSaveDates(orderedSelection)
    setIsSaving(false)
    if (error) {
      setSaveError(error)
      return
    }
    leaveAddingMode(count)
  }

  function focusSelectableDate(target: CivilDate, direction: -1 | 1) {
    let date = target
    for (let attempt = 0; attempt < 370; attempt += 1) {
      if (date > today) return
      if (!recordedStarts.has(date)) {
        pendingFocusDate.current = date
        setFocusedDate(date)
        showMonth(`${date.slice(0, 7)}-01`)
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
    <section className="calendar-section" lang={locale} aria-labelledby="calendar-month-title">
      <div className="calendar-heading">
        <button
          className="month-nav-button month-nav-previous"
          type="button"
          aria-label={monthNavigation.previous}
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className="calendar-month-summary">
          <button
            className="secondary-button today-button"
            type="button"
            disabled={monthStart === `${today.slice(0, 7)}-01`}
            onClick={goToToday}
          >
            {todayLabel}
          </button>
          <div className="calendar-month-context">
            <p className="section-label">{text('Dates enregistrées', 'Recorded dates')}</p>
            <h2 id="calendar-month-title" aria-live="polite" aria-atomic="true">
              {formattedMonthTitle}
            </h2>
          </div>
        </div>
        <button
          className="month-nav-button month-nav-next"
          type="button"
          aria-label={monthNavigation.next}
          onClick={() => changeMonth(1)}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      {phaseRanges && (
        <ul className="calendar-legend phase-calendar-legend" aria-label={text('Phases du cycle', 'Cycle phases')}>
          {cyclePhaseNames.map((phase) => (
            <li key={phase}>
              <span className={`phase-legend-swatch phase-legend-${phase}`} aria-hidden="true" />
              {phaseLabels[phase][locale]}
            </li>
          ))}
          <li>
            <span className="phase-legend-swatch phase-legend-possible" aria-hidden="true" />
            {text('Dates possibles', 'Possible dates')}
          </li>
        </ul>
      )}

      <div
        className={`calendar-month-viewport${hasChangedMonth ? (monthDirection > 0 ? ' is-entering-next' : ' is-entering-previous') : ''}`}
        key={monthStart}
      >
        <table
          ref={calendarTableRef}
          className="calendar-table"
          aria-label={text(`Calendrier pour ${monthTitle}`, `Calendar for ${monthTitle}`)}
          onPointerDown={handleMonthPointerDown}
          onPointerMove={handleMonthPointerMove}
          onPointerUp={finishMonthSwipe}
          onPointerCancel={cancelMonthSwipe}
          onClickCapture={preventDateClickAfterSwipe}
        >
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
                  const isRecordedDay = recordedSpans.some(
                    ({ start, duration }) => day.date >= start && daysBetweenCivilDates(start, day.date) < duration,
                  )
                  const datePhases: Array<{ phase: CyclePhaseName; possible: boolean }> = []
                  if (day.inDisplayedMonth && !isRecordedDay && phaseRanges) {
                    for (const phase of cyclePhaseNames) {
                      const ranges = phaseRanges[phase]
                      if (dateIsInRange(ranges.expected, day.date)) datePhases.push({ phase, possible: false })
                      else if (dateIsInRange(ranges.possible, day.date)) datePhases.push({ phase, possible: true })
                    }
                  }
                  const expectedPhases = datePhases.filter(({ possible }) => !possible)
                  const possiblePhases = datePhases.filter(({ possible }) => possible)
                  const isOvulationPeak = expectedPhases.some(({ phase }) => phase === 'ovulatory')
                  const phaseBackgroundLayers = datePhases.map(({ phase, possible }) => {
                    const opacity = possible ? 8 : 24
                    const color = `color-mix(in srgb, var(--phase-${phase}) ${opacity}%, transparent)`
                    return `linear-gradient(${color}, ${color})`
                  })
                  const isForecastDay =
                    !isRecordedDay && dateIsInRange(phaseRanges?.menstrual.expected ?? null, day.date)
                  const isForecastRange =
                    estimate.kind === 'range' &&
                    day.date >= estimate.earliestStartDate &&
                    day.date <= estimate.latestStartDate
                  const isForecastLowerBound = estimate.kind === 'range' && day.date === estimate.earliestStartDate
                  const isForecastUpperBound = estimate.kind === 'range' && day.date === estimate.latestStartDate
                  const dateDescriptions = [
                    ...(hasPeriodStart
                      ? [
                          isFutureStart
                            ? text('Début enregistré pour une date à venir', 'Recorded period start on a future date')
                            : recordedLabel,
                        ]
                      : []),
                    ...(isForecastLowerBound
                      ? [text('Borne basse de la plage estimée', 'Earliest date in the estimated range')]
                      : []),
                    ...(isForecastUpperBound
                      ? [text('Borne haute de la plage estimée', 'Latest date in the estimated range')]
                      : []),
                    ...(isForecastCenter ? [centerLabel] : []),
                    ...(isRecordedDay && !hasPeriodStart ? [text('Jour de règles', 'Period day')] : []),
                    ...(isForecastDay && !isForecastCenter && !isForecastLowerBound && !isForecastUpperBound
                      ? [text('Jour de règles estimé', 'Estimated period day')]
                      : []),
                    ...(isForecastRange && !isForecastCenter && !isForecastLowerBound && !isForecastUpperBound
                      ? [text('Dans la plage estimée', 'Within the estimated range')]
                      : []),
                    ...(estimate.kind !== 'insufficient' && estimate.isPast && isForecastCenter
                      ? [text('Estimation passée', 'Past estimate')]
                      : []),
                  ]
                  const phaseDescriptionId = datePhases.length > 0 ? `phase-description-${day.date}` : undefined
                  const unavailableReason = hasPeriodStart
                    ? text('début déjà enregistré, non sélectionnable', 'period start already recorded, unavailable')
                    : isFuture
                      ? text('date future, non sélectionnable', 'future date, unavailable')
                      : ''
                  const dateLabel = day.inDisplayedMonth ? formatCivilDate(day.date, locale) : ''

                  return (
                    <td
                      key={day.date}
                      style={
                        phaseBackgroundLayers.length > 0
                          ? { backgroundImage: phaseBackgroundLayers.join(', ') }
                          : undefined
                      }
                      className={[
                        day.inDisplayedMonth ? '' : 'is-outside-month',
                        day.date === today ? 'is-today' : '',
                        day.inDisplayedMonth && isRecordedDay ? 'has-period-day' : '',
                        day.inDisplayedMonth && isForecastDay ? 'has-estimated-period-day' : '',
                        isFutureStart ? 'is-future-start' : '',
                        isForecastRange ? 'is-estimated-range' : '',
                        isForecastCenter ? 'is-estimated-center' : '',
                        isForecastLowerBound || isForecastUpperBound ? 'is-estimated-bound' : '',
                        ...expectedPhases.map(({ phase }) => `phase-expected-${phase}`),
                        ...possiblePhases.map(({ phase }) => `phase-possible-${phase}`),
                        isOvulationPeak ? 'is-ovulation-peak' : '',
                        estimate.kind !== 'insufficient' && estimate.isPast && isForecastCenter
                          ? 'is-estimate-past'
                          : '',
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
                            aria-label={`${dateLabel}${isSelected ? text(', sélectionnée', ', selected') : ''}${unavailableReason ? `, ${unavailableReason}` : ''}`}
                            aria-pressed={isSelected}
                            disabled={Boolean(unavailableReason)}
                            tabIndex={focusedDate === day.date ? 0 : -1}
                            aria-describedby={phaseDescriptionId}
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
                            aria-describedby={phaseDescriptionId}
                            aria-label={
                              dateDescriptions.length > 0
                                ? locale === 'en'
                                  ? `${dateLabel}: ${new Intl.ListFormat('en-US').format(dateDescriptions)}`
                                  : `${dateDescriptions.join(' et ')} le ${dateLabel}`
                                : dateLabel
                            }
                          >
                            <span className="calendar-day-number">{dayNumber}</span>
                            <span className="calendar-markers" aria-hidden="true">
                              {isForecastRange && <span className="forecast-range-mark" />}
                              {(isForecastLowerBound || isForecastUpperBound) && (
                                <span className="forecast-bound-mark" />
                              )}
                            </span>
                          </time>
                        ))}
                      {day.inDisplayedMonth && phaseDescriptionId && (
                        <span id={phaseDescriptionId} className="visually-hidden">
                          {datePhases
                            .map(({ phase, possible }) => phaseDescription(phase, possible, locale))
                            .join('; ')}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {saveError && (
        <p className="field-error calendar-save-error" role="alert">
          {locale === 'en' ? (englishSaveErrors.get(saveError) ?? saveError) : saveError}
        </p>
      )}
      <p className="form-feedback form-feedback-success" role="status" aria-live="polite" aria-atomic="true">
        {saveMessage}
      </p>

      <ul className="calendar-legend" aria-label={text('Légende du calendrier', 'Calendar legend')}>
        {today.slice(0, 7) === monthStart.slice(0, 7) && (
          <li>
            <span className="calendar-today-mark" aria-hidden="true" />
            {todayLabel}
          </li>
        )}
        <li>
          <span className="period-start-mark" aria-hidden="true" />
          {text('Règles enregistrées', 'Recorded period')}
        </li>
        {estimate.kind === 'range' && (
          <>
            <li>
              <span className="forecast-range-mark" aria-hidden="true" />
              {text('Plage estimée', 'Estimated range')}
            </li>
            <li>
              <span className="forecast-bound-mark" aria-hidden="true" />
              {text('Bornes basse et haute', 'Earliest and latest dates')}
            </li>
          </>
        )}
        {estimate.kind !== 'insufficient' && (
          <li>
            <span className="forecast-center-mark" aria-hidden="true" />
            {text('Règles estimées', 'Estimated period')}
          </li>
        )}
        {phaseRanges && (
          <li>
            <span className="ovulation-peak-mark" aria-hidden="true" />
            {text('Pic d’ovulation estimé (Peak ovulation)', 'Peak ovulation')}
          </li>
        )}
      </ul>

      {monthPeriodStarts.size === 0 && !isAdding && (
        <div className="calendar-empty-note">
          <p>{text('Aucune date de début enregistrée pour ce mois.', 'No period starts recorded for this month.')}</p>
        </div>
      )}

      {!isAdding ? (
        <div className="calendar-add-action">
          <button className="secondary-button" ref={addModeButtonRef} type="button" onClick={enterAddingMode}>
            {addLabel}
          </button>
        </div>
      ) : (
        <div className="calendar-selection-panel" aria-labelledby="calendar-selection-title">
          <div>
            <h3 id="calendar-selection-title">{addLabel}</h3>
            <p>
              {text(
                'Choisis chaque date séparément; aucune plage continue ne sera sélectionnée.',
                'Choose each date separately; this does not select a continuous range.',
              )}
            </p>
            <p className="field-hint">
              {text(
                'Les dates futures et les débuts déjà enregistrés sont désactivés.',
                'Future dates and already recorded period starts are unavailable.',
              )}
            </p>
            <p className="selection-count" aria-live="polite" aria-atomic="true">
              {text(`${selection} sélectionné${count === 1 ? '' : 's'}`, `${selection} selected`)}
            </p>
          </div>
          <div className="calendar-selection-actions">
            <button className="secondary-button" type="button" disabled={isSaving} onClick={() => leaveAddingMode()}>
              {text('Annuler', 'Cancel')}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={orderedSelection.length === 0 || isSaving}
              onClick={saveSelectedDates}
            >
              {isSaving ? text('Enregistrement…', 'Saving…') : text(`Enregistrer ${selection}`, `Save ${selection}`)}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
