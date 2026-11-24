import type { CivilDate, Period } from '../../domain/periods'
import { getCycleHistory } from '../../domain/history/get-cycle-history'
import { formatCivilDate, type Locale } from '../shared/format-civil-date'

type CycleHistoryViewProps = {
  readonly locale?: Locale
  periods: Period[]
  today: CivilDate
}

export function CycleHistoryView({ periods, today, locale = 'fr' }: CycleHistoryViewProps) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const history = getCycleHistory(periods, today)
  const futureStarts = periods
    .filter((period) => period.startDate > today)
    .sort((left, right) => {
      return left.startDate.localeCompare(right.startDate)
    })
  const pastStartCount = periods.filter((period) => period.startDate <= today).length

  const futureStartsLabel = text('Dates enregistrées à venir', 'Recorded future dates')

  return (
    <section className="cycle-history-section" lang={locale} aria-labelledby="cycle-history-title">
      <div className="cycle-history-heading">
        <p className="section-label">{text('Tes dates enregistrées', 'Your recorded dates')}</p>
        <h2 id="cycle-history-title">{text('Historique des intervalles', 'Cycle interval history')}</h2>
      </div>
      <p className="cycle-history-definition">
        {text(
          'Un intervalle mesure les jours entre deux débuts successifs, pas la durée des règles.',
          'An interval measures the days between consecutive period starts, not how long a period lasts.',
        )}
      </p>

      {history.intervals.length > 0 ? (
        <>
          <p className="cycle-history-summary">
            <strong>
              {history.intervals.length}{' '}
              {history.intervals.length === 1
                ? text('intervalle observé', 'observed interval')
                : text('intervalles observés', 'observed intervals')}
            </strong>
            {history.shortestIntervalDays === history.longestIntervalDays ? (
              <span>
                {text(
                  `Tous les intervalles observés durent ${history.shortestIntervalDays} jours.`,
                  `All observed intervals are ${history.shortestIntervalDays} ${history.shortestIntervalDays === 1 ? 'day' : 'days'} long.`,
                )}
              </span>
            ) : (
              <span>
                {text(
                  `Les intervalles observés vont de ${history.shortestIntervalDays} à ${history.longestIntervalDays} jours.`,
                  `Observed intervals range from ${history.shortestIntervalDays} to ${history.longestIntervalDays} days.`,
                )}
              </span>
            )}
          </p>

          <ol
            className="cycle-history-list"
            aria-label={text('Intervalles entre les débuts enregistrés', 'Intervals between recorded period starts')}
          >
            {history.intervals.map(({ previousStartDate, nextStartDate, durationDays }) => (
              <li key={`${previousStartDate}-${nextStartDate}`}>
                <span className="cycle-history-dates">
                  <time dateTime={previousStartDate}>{formatCivilDate(previousStartDate, locale)}</time>
                  <span>{text(' au ', ' to ')}</span>
                  <time dateTime={nextStartDate}>{formatCivilDate(nextStartDate, locale)}</time>
                </span>
                <span className="cycle-history-duration">
                  {durationDays} {durationDays === 1 ? text('jour', 'day') : text('jours', 'days')}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="cycle-history-empty">
          {pastStartCount === 1
            ? text(
                'Une autre date passée est nécessaire pour calculer un intervalle.',
                'Record one more past date to calculate an interval.',
              )
            : text(
                'Enregistre deux débuts passés pour afficher les intervalles entre eux.',
                'Record two past period starts to see the interval between them.',
              )}
        </p>
      )}

      {futureStarts.length > 0 && (
        <section className="future-starts" aria-labelledby="future-starts-title">
          <h3 id="future-starts-title">{futureStartsLabel}</h3>
          <ul aria-label={futureStartsLabel}>
            {futureStarts.map(({ id, startDate }) => (
              <li key={id}>
                <time dateTime={startDate}>{formatCivilDate(startDate, locale)}</time>
                <span>
                  {text(
                    'Date à venir; ne contribue pas aux intervalles passés.',
                    'Future date; not included in past intervals.',
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
