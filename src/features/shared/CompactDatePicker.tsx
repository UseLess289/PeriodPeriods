import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { addCivilDays, buildCalendarMonth, shiftCalendarMonth } from '../../domain/dates'
import type { CivilDate } from '../../domain/periods'
import { formatCivilDate } from './format-civil-date'

type CompactDatePickerProps = {
  value: CivilDate
  today: CivilDate
  firstDayOfWeek: 0 | 1
  anchorRef: RefObject<HTMLDivElement | null>
  onSelect: (date: CivilDate) => void
  onCancel: () => void
}

function getMonthTitle(monthStart: CivilDate): string {
  const title = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${monthStart}T00:00:00.000Z`))
  return `${title[0].toLocaleUpperCase('fr-FR')}${title.slice(1)}`
}

function getMonthDayCount(monthStart: CivilDate): number {
  const date = new Date(`${monthStart}T00:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + 1, 0)
  return date.getUTCDate()
}

export function CompactDatePicker({
  value,
  today,
  firstDayOfWeek,
  anchorRef,
  onSelect,
  onCancel,
}: CompactDatePickerProps) {
  const [monthStart, setMonthStart] = useState<CivilDate>(`${value.slice(0, 7)}-01`)
  const [focusedDate, setFocusedDate] = useState<CivilDate>(value)
  const dateButtons = useRef(new Map<CivilDate, HTMLButtonElement>())
  const pickerRef = useRef<HTMLElement>(null)
  const pendingFocusDate = useRef<CivilDate | null>(null)
  const focusInitialDate = useRef(true)
  const monthTitle = getMonthTitle(monthStart)
  const monthDays = buildCalendarMonth(monthStart, firstDayOfWeek)
  const todayMonth = `${today.slice(0, 7)}-01`
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const weekday = (firstDayOfWeek + index) % 7
    const date = new Date('2023-01-01T00:00:00.000Z')
    date.setUTCDate(date.getUTCDate() + weekday)
    return {
      longName: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' }).format(date),
      shortName: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date),
    }
  })

  useLayoutEffect(() => {
    const dateToFocus = focusInitialDate.current ? focusedDate : pendingFocusDate.current
    if (dateToFocus) dateButtons.current.get(dateToFocus)?.focus()
    focusInitialDate.current = false
    pendingFocusDate.current = null
  }, [focusedDate, monthStart])

  useLayoutEffect(() => {
    function updatePlacement() {
      const anchor = anchorRef.current
      const picker = pickerRef.current
      if (!anchor || !picker) return

      const anchorBounds = anchor.getBoundingClientRect()
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const navigationHeight = document.querySelector('.bottom-nav')?.getBoundingClientRect().height ?? 0
      const roomAbove = Math.max(0, anchorBounds.top - 8)
      const roomBelow = Math.max(0, viewportHeight - anchorBounds.bottom - navigationHeight - 8)
      const pickerHeight = picker.scrollHeight
      const placement =
        roomAbove >= pickerHeight
          ? 'above'
          : roomBelow >= pickerHeight
            ? 'below'
            : roomBelow >= roomAbove
              ? 'below'
              : 'above'
      const availableHeight = placement === 'above' ? roomAbove : roomBelow

      picker.dataset.placement = placement
      picker.style.maxHeight = `${Math.max(180, availableHeight)}px`
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.visualViewport?.addEventListener('resize', updatePlacement)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.visualViewport?.removeEventListener('resize', updatePlacement)
    }
  }, [anchorRef])

  function focusDate(date: CivilDate) {
    if (date > today) return
    pendingFocusDate.current = date
    setFocusedDate(date)
    setMonthStart(`${date.slice(0, 7)}-01`)
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: CivilDate) {
    let target: CivilDate | null = null
    if (event.key === 'ArrowRight') target = addCivilDays(date, 1)
    if (event.key === 'ArrowLeft') target = addCivilDays(date, -1)
    if (event.key === 'ArrowDown') target = addCivilDays(date, 7)
    if (event.key === 'ArrowUp') target = addCivilDays(date, -7)
    if (event.key === 'Home' || event.key === 'End') {
      const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay()
      const offset = (weekday - firstDayOfWeek + 7) % 7
      target = addCivilDays(date, event.key === 'Home' ? -offset : 6 - offset)
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      const shiftedMonth = shiftCalendarMonth(date, event.key === 'PageUp' ? -1 : 1)
      const day = Math.min(Number(date.slice(-2)), getMonthDayCount(shiftedMonth))
      target = `${shiftedMonth.slice(0, 7)}-${day.toString().padStart(2, '0')}`
      if (target > today) target = today
    }

    if (target) {
      event.preventDefault()
      focusDate(target)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <section
      className="compact-date-picker"
      ref={pickerRef}
      role="dialog"
      aria-labelledby="compact-date-picker-title"
      tabIndex={-1}
    >
      <div className="compact-date-heading">
        <h3 id="compact-date-picker-title" aria-live="polite" aria-atomic="true">
          {monthTitle}
        </h3>
        <div className="compact-date-navigation">
          <button
            className="month-nav-button"
            type="button"
            aria-label="Mois précédent"
            onClick={() => setMonthStart((month) => shiftCalendarMonth(month, -1))}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            className="month-nav-button"
            type="button"
            aria-label="Mois suivant"
            disabled={monthStart >= todayMonth}
            onClick={() => setMonthStart((month) => shiftCalendarMonth(month, 1))}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <table className="compact-date-table" aria-label={`Calendrier de saisie pour ${monthTitle}`}>
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
          {Array.from({ length: monthDays.length / 7 }, (_, weekIndex) => (
            <tr key={monthDays[weekIndex * 7].date}>
              {monthDays.slice(weekIndex * 7, weekIndex * 7 + 7).map(({ date, inDisplayedMonth }) => {
                if (!inDisplayedMonth) return <td key={date} aria-hidden="true" />

                const isFuture = date > today
                const isSelected = date === value
                return (
                  <td key={date}>
                    <button
                      ref={(element) => {
                        if (element) dateButtons.current.set(date, element)
                        else dateButtons.current.delete(date)
                      }}
                      className="compact-date-day"
                      type="button"
                      aria-label={`${formatCivilDate(date)}${isSelected ? ', sélectionnée' : ''}${isFuture ? ', date future non sélectionnable' : ''}`}
                      aria-pressed={isSelected}
                      disabled={isFuture}
                      tabIndex={focusedDate === date ? 0 : -1}
                      onClick={() => onSelect(date)}
                      onKeyDown={(event) => handleDayKeyDown(event, date)}
                    >
                      <span>{Number(date.slice(-2))}</span>
                      <span className="compact-date-check" aria-hidden="true">
                        {isSelected ? '✓' : ''}
                      </span>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="compact-date-help">Les dates après aujourd’hui ne sont pas sélectionnables.</p>
      <button className="secondary-button compact-date-cancel" type="button" onClick={onCancel}>
        Annuler
      </button>
    </section>
  )
}
