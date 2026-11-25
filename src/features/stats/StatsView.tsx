import type { CivilDate, Period } from '../../domain/periods'
import { getCycleHistory } from '../../domain/history/get-cycle-history'
import { backtestForecast } from '../../domain/forecast/backtest'
import { estimatePhases, projectYear, type EstimatedPhase } from '../../domain/forecast/project-year'
import { formatCivilDate, type Locale } from '../shared/format-civil-date'
import { CycleHistoryView } from '../history/CycleHistoryView'

type StatsViewProps = {
  readonly periods: Period[]
  readonly today: CivilDate
  readonly locale?: Locale
}

const englishPhaseNames = {
  menstruelle: 'Menstrual',
  folliculaire: 'Follicular',
  ovulatoire: 'Ovulatory',
  lutéale: 'Luteal',
} as const satisfies Record<EstimatedPhase['name'], string>

export function StatsView({ periods, today, locale = 'fr' }: StatsViewProps) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const history = getCycleHistory(periods, today)
  const evaluation = backtestForecast(periods, today)
  const projections = projectYear(periods, today)
  const lengths = history.intervals.map((interval) => interval.durationDays)
  const plotted = lengths
    .map(
      (value, index) =>
        `${24 + (index * 452) / Math.max(1, lengths.length - 1)},${115 - Math.min(90, Math.max(0, value - 15) * 3)}`,
    )
    .join(' ')
  const phases = projections[0] ? estimatePhases(projections[0], periods) : []

  return (
    <div className="view-stack stats-layout" lang={locale}>
      <section aria-labelledby="stats-chart-title">
        <h2 id="stats-chart-title">{text('Durées observées des cycles', 'Observed cycle lengths')}</h2>
        {lengths.length > 0 ? (
          <>
            <svg
              className="stats-chart"
              viewBox="0 0 500 140"
              role="img"
              aria-label={text(
                `Durées successives en jours : ${lengths.join(', ')}`,
                `Consecutive cycle lengths in days: ${lengths.join(', ')}`,
              )}
            >
              <line x1="24" x2="476" y1="115" y2="115" stroke="currentColor" opacity=".35" />
              <polyline
                points={plotted}
                fill="none"
                stroke="var(--color-accent-deep)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {lengths.map((value, index) => (
                <circle
                  key={index}
                  cx={24 + (index * 452) / Math.max(1, lengths.length - 1)}
                  cy={115 - Math.min(90, Math.max(0, value - 15) * 3)}
                  r="4"
                  fill="var(--color-accent-deep)"
                >
                  <title>
                    {locale === 'en'
                      ? `${formatCivilDate(history.intervals[index].nextStartDate, locale)}: ${value} ${value === 1 ? 'day' : 'days'}`
                      : `${history.intervals[index].nextStartDate} : ${value} jours`}
                  </title>
                </circle>
              ))}
            </svg>
            <p className="field-hint">
              {text(
                'Chaque point représente le nombre de jours entre deux débuts enregistrés. La liste ci-dessous reprend les valeurs.',
                'Each point shows the number of days between two recorded period starts. The values are also listed below.',
              )}
            </p>
          </>
        ) : (
          <p>
            {text(
              'Deux débuts passés sont nécessaires pour tracer les intervalles.',
              'Record two past period starts to plot the intervals.',
            )}
          </p>
        )}
      </section>
      <section aria-labelledby="stats-evaluation-title">
        <h2 id="stats-evaluation-title">{text('Évaluation sur ton historique', 'Evaluation on your history')}</h2>
        {evaluation ? (
          <p>
            {text(
              `Sur ${evaluation.evaluatedCycles} début(s) passés masqués tour à tour, l’erreur absolue médiane de la date centrale était de ${evaluation.medianAbsoluteErrorDays} jour(s).${evaluation.rangeCoverage === null ? '' : ` Les plages disponibles couvraient ${Math.round(evaluation.rangeCoverage * 100)} % des débuts évalués.`} Ce résultat décrit les saisies passées, pas une précision future garantie.`,
              `Across ${evaluation.evaluatedCycles} past starts held out one at a time, the median absolute error of the central date was ${evaluation.medianAbsoluteErrorDays} day(s).${evaluation.rangeCoverage === null ? '' : ` Available ranges covered ${Math.round(evaluation.rangeCoverage * 100)}% of evaluated starts.`} This describes past logs, not guaranteed future accuracy.`,
            )}
          </p>
        ) : (
          <p>
            {text(
              'Il faut davantage de débuts enregistrés pour comparer les estimations aux dates observées.',
              'More recorded starts are needed to compare estimates with observations.',
            )}
          </p>
        )}
      </section>
      <section aria-labelledby="stats-year-title">
        <h2 id="stats-year-title">
          {text('Projections conditionnelles sur un an', 'Conditional projections for the next year')}
        </h2>
        <p>
          {text(
            'Ces dates supposent que les intervalles futurs suivent ceux observés. Les plages s’élargissent au fil des cycles ; elles ne sont pas des garanties.',
            'These dates assume future intervals follow the same pattern as recorded intervals. The ranges widen over time and are not guarantees.',
          )}
        </p>
        {projections.length === 0 ? (
          <p>
            {text(
              'Trois intervalles passés sont nécessaires pour afficher des projections.',
              'Three past intervals are needed to show projections.',
            )}
          </p>
        ) : (
          <ol className="projected-list">
            {projections.map((cycle) => (
              <li key={cycle.index}>
                <time dateTime={cycle.startDate}>{formatCivilDate(cycle.startDate, locale)}</time>
                <span>
                  {text('Plage conditionnelle : ', 'Conditional range: ')}
                  {formatCivilDate(cycle.earliestStartDate, locale)} – {formatCivilDate(cycle.latestStartDate, locale)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section aria-labelledby="stats-phases-title">
        <h2 id="stats-phases-title">{text('Quatre phases estimées', 'Four estimated phases')}</h2>
        <p>
          {text(
            'Schéma théorique des quatre phases : seule la durée des règles est projetée depuis les durées saisies. Les repères colorés du calendrier utilisent des conventions approximatives; les dates de règles seules ne permettent pas de confirmer les autres frontières. Ce schéma ne permet pas de déterminer une fenêtre contraceptive.',
            'A theoretical diagram of four phases: only period length is projected from recorded lengths. Colored calendar markers use approximate conventions; period dates alone cannot confirm the other boundaries. Do not use this diagram to identify a contraceptive window.',
          )}
        </p>
        {phases.length === 0 ? (
          <p>
            {text(
              'Une fin de règles enregistrée et un historique suffisant sont nécessaires pour afficher ces repères.',
              'A recorded period end date and enough cycle history are needed to show these phases.',
            )}
          </p>
        ) : (
          <div
            className="phase-chart"
            role="list"
            aria-label={text('Phases estimées du prochain cycle', 'Estimated phases of the next cycle')}
          >
            {phases.map((phase) => (
              <div role="listitem" className={`phase-segment phase-${phase.name}`} key={phase.name}>
                <strong>{locale === 'en' ? englishPhaseNames[phase.name] : phase.name}</strong>
                <span>
                  {phase.startDate && phase.endDate
                    ? `${formatCivilDate(phase.startDate, locale)} – ${formatCivilDate(phase.endDate, locale)}`
                    : text('Dates non déterminées', 'Dates not determined')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <CycleHistoryView periods={periods} today={today} locale={locale} />
    </div>
  )
}
