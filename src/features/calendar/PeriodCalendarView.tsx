import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { buildCalendarMonth, shiftCalendarMonth } from '../../domain/dates'
import type { PeriodStartEstimate } from '../../domain/forecast/estimate-next-period'
import type { CivilDate, Period } from '../../domain/periods'
import { formatCivilDate } from '../shared/format-civil-date'

type PeriodCalendarViewProps = {
  periods: Period[]
  estimate: PeriodStartEstimate
  firstDayOfWeek: 0 | 1
  today: CivilDate
  onAddDate: () => void
}

export function PeriodCalendarView({ periods, estimate, firstDayOfWeek, today, onAddDate }: PeriodCalendarViewProps) {
  const [monthStart, setMonthStart] = useState<CivilDate>(`${today.slice(0, 7)}-01`)
  const monthTitle = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${monthStart}T00:00:00.000Z`))
  const formattedMonthTitle = `${monthTitle[0].toLocaleUpperCase('fr-FR')}${monthTitle.slice(1)}`
  const calendarDays = buildCalendarMonth(monthStart, firstDayOfWeek)
  const monthPeriodStarts = new Set(
    periods.filter((period) => period.startDate.startsWith(monthStart.slice(0, 7))).map((period) => period.startDate),
  )
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const weekday = (firstDayOfWeek + index) % 7
    const date = new Date('2023-01-01T00:00:00.000Z')
    date.setUTCDate(date.getUTCDate() + weekday)
    return {
      longName: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' }).format(date),
      shortName: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date),
    }
  })

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
            onClick={() => setMonthStart((month) => shiftCalendarMonth(month, -1))}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            className="month-nav-button"
            type="button"
            aria-label="Mois suivant"
            onClick={() => setMonthStart((month) => shiftCalendarMonth(month, 1))}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

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
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden={day.inDisplayedMonth ? undefined : 'true'}
                  >
                    {day.inDisplayedMonth && (
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
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

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

      {monthPeriodStarts.size === 0 && (
        <div className="calendar-empty-note">
          <p>Aucune date de début enregistrée pour ce mois.</p>
          <button className="text-button" type="button" onClick={onAddDate}>
            Ajouter une date
          </button>
        </div>
      )}
    </section>
  )
}
