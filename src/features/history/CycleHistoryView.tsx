import type { CivilDate, Period } from '../../domain/periods'
import { getCycleHistory } from '../../domain/history/get-cycle-history'
import { formatCivilDate } from '../shared/format-civil-date'

type CycleHistoryViewProps = {
  periods: Period[]
  today: CivilDate
}

export function CycleHistoryView({ periods, today }: CycleHistoryViewProps) {
  const history = getCycleHistory(periods, today)
  const futureStarts = periods
    .filter((period) => period.startDate > today)
    .sort((left, right) => {
      return left.startDate.localeCompare(right.startDate)
    })
  const pastStartCount = periods.filter((period) => period.startDate <= today).length

  return (
    <section className="cycle-history-section" aria-labelledby="cycle-history-title">
      <div className="cycle-history-heading">
        <p className="section-label">Tes dates enregistrées</p>
        <h2 id="cycle-history-title">Historique des intervalles</h2>
      </div>
      <p className="cycle-history-definition">
        Un intervalle mesure les jours entre deux débuts successifs, pas la durée des règles.
      </p>

      {history.intervals.length > 0 ? (
        <>
          <p className="cycle-history-summary">
            <strong>
              {history.intervals.length}{' '}
              {history.intervals.length === 1 ? 'intervalle observé' : 'intervalles observés'}
            </strong>
            {history.shortestIntervalDays === history.longestIntervalDays ? (
              <span>Tous les intervalles observés durent {history.shortestIntervalDays} jours.</span>
            ) : (
              <span>
                Les intervalles observés vont de {history.shortestIntervalDays} à {history.longestIntervalDays} jours.
              </span>
            )}
          </p>

          <ol className="cycle-history-list" aria-label="Intervalles entre les débuts enregistrés">
            {history.intervals.map(({ previousStartDate, nextStartDate, durationDays }) => (
              <li key={`${previousStartDate}-${nextStartDate}`}>
                <span className="cycle-history-dates">
                  <time dateTime={previousStartDate}>{formatCivilDate(previousStartDate)}</time>
                  <span>{' au '}</span>
                  <time dateTime={nextStartDate}>{formatCivilDate(nextStartDate)}</time>
                </span>
                <span className="cycle-history-duration">
                  {durationDays} {durationDays === 1 ? 'jour' : 'jours'}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="cycle-history-empty">
          {pastStartCount === 1
            ? 'Une autre date passée est nécessaire pour calculer un intervalle.'
            : 'Enregistre deux débuts passés pour afficher les intervalles entre eux.'}
        </p>
      )}

      {futureStarts.length > 0 && (
        <section className="future-starts" aria-labelledby="future-starts-title">
          <h3 id="future-starts-title">Dates enregistrées à venir</h3>
          <ul aria-label="Dates enregistrées à venir">
            {futureStarts.map(({ id, startDate }) => (
              <li key={id}>
                <time dateTime={startDate}>{formatCivilDate(startDate)}</time>
                <span>Date à venir; ne contribue pas aux intervalles passés.</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
