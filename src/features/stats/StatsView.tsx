import { useState } from 'react'
import {
  getPeriodDuration,
  type CivilDate,
  type DailyIntensity,
  type Intensity,
  type Period,
} from '../../domain/periods'
import { getCycleHistory } from '../../domain/history/get-cycle-history'
import { formatCivilDate, type Locale } from '../shared/format-civil-date'

type StatsViewProps = {
  readonly periods: Period[]
  readonly today: CivilDate
  readonly locale?: Locale
}

type CellValue =
  | { readonly kind: 'intensity'; readonly value: Intensity }
  | { readonly kind: 'legacy-present' }
  | { readonly kind: 'legacy-absent' }
  | { readonly kind: 'not-logged' }
  | { readonly kind: 'outside' }

const metricLabels: Record<DailyIntensity, { fr: string; en: string }> = {
  flowIntensity: { fr: 'Flux', en: 'Flow' },
  crampsIntensity: { fr: 'Crampes', en: 'Cramps' },
  headacheIntensity: { fr: 'Maux de tête', en: 'Headache' },
  fatigueIntensity: { fr: 'Fatigue', en: 'Fatigue' },
}
const metricOrder = ['flowIntensity', 'crampsIntensity', 'headacheIntensity', 'fatigueIntensity'] as const

const flowLevels = { light: 1, medium: 2, heavy: 3 } as const satisfies Record<NonNullable<Period['flow']>, Intensity>

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function getDomain(values: readonly number[]) {
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const lower = Math.max(0, Math.floor((minimum - 5) / 10) * 10)
  let upper = Math.ceil((maximum + 5) / 10) * 10
  if (upper <= lower) upper = lower + 10
  return { lower, middle: lower + (upper - lower) / 2, upper }
}

function getCellValue(period: Period, day: number, metric: DailyIntensity, duration: number): CellValue {
  if (day > duration) return { kind: 'outside' }
  const entry = period.dailyLogs?.find((log) => log.day === day)
  if (!entry) return { kind: 'not-logged' }

  const value = entry[metric]
  if (value !== undefined) return { kind: 'intensity', value }

  if (metric === 'flowIntensity' && entry.flow) {
    return { kind: 'intensity', value: flowLevels[entry.flow] }
  }
  if (metric === 'headacheIntensity' && entry.headache !== undefined) {
    return entry.headache ? { kind: 'legacy-present' } : { kind: 'legacy-absent' }
  }

  return { kind: 'not-logged' }
}

function cellDescription(value: CellValue, locale: Locale): string {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  if (value.kind === 'intensity') {
    return `${value.value} ${text('sur 3', 'of 3')}`
  }
  if (value.kind === 'legacy-present') return text('Présent, ancien suivi', 'Present, previous tracking')
  if (value.kind === 'legacy-absent') return text('Absent, ancien suivi', 'Absent, previous tracking')
  if (value.kind === 'outside') return text('Hors durée enregistrée', 'Outside recorded duration')
  return text('Non renseigné', 'Not logged')
}

function cellMark(value: CellValue): string {
  if (value.kind === 'intensity') return String(value.value)
  if (value.kind === 'legacy-present') return '✓'
  if (value.kind === 'legacy-absent') return '0'
  if (value.kind === 'outside') return '·'
  return '—'
}

export function StatsView({ periods, today, locale = 'fr' }: StatsViewProps) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const history = getCycleHistory(periods, today)
  const [showAllIntervals, setShowAllIntervals] = useState(false)
  const [metric, setMetric] = useState<DailyIntensity>('flowIntensity')
  const intervals = showAllIntervals ? history.intervals : history.intervals.slice(-6)
  const intervalValues = intervals.map(({ durationDays }) => durationDays)
  const domain = intervalValues.length ? getDomain(intervalValues) : null
  const latestPeriods = periods
    .filter(({ startDate }) => startDate <= today)
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
    .slice(0, 6)
  const dayCount = Math.max(0, ...latestPeriods.map(getPeriodDuration))
  const loggedCount = latestPeriods.reduce((count, period) => {
    const duration = getPeriodDuration(period)
    return (
      count +
      Array.from({ length: duration }, (_, index) => getCellValue(period, index + 1, metric, duration)).filter(
        (value) => value.kind === 'intensity' || value.kind === 'legacy-present' || value.kind === 'legacy-absent',
      ).length
    )
  }, 0)

  return (
    <div className="view-stack stats-layout" lang={locale}>
      <section className="stats-section cycle-length-section" aria-labelledby="stats-cycle-title">
        <div className="stats-section-heading">
          <div>
            <p className="section-label">{text('Intervalles observés', 'Observed intervals')}</p>
            <h2 id="stats-cycle-title">{text('Durée des cycles', 'Cycle length')}</h2>
          </div>
          {intervalValues.length > 0 && (
            <p className="stats-cycle-summary">
              <strong>
                {median(intervalValues)} {text('jours', 'days')}
              </strong>
              <span>
                {text('médiane · ', 'median · ')}
                {intervalValues.length}{' '}
                {intervalValues.length === 1 ? text('intervalle', 'interval') : text('intervalles', 'intervals')}
              </span>
            </p>
          )}
        </div>

        <p className="stats-description">
          {text(
            'Jours entre deux débuts enregistrés. Chaque point est une durée observée, pas une prévision.',
            'Days between recorded period starts. Each dot is an observed length, not a prediction.',
          )}
        </p>

        {intervals.length > 0 && domain ? (
          <>
            <div
              className="cycle-dot-plot"
              role="group"
              aria-label={text(
                `${intervals.length} ${intervals.length === 1 ? 'intervalle observé' : 'intervalles observés'}, en jours, du plus ancien au plus récent.`,
                `${intervals.length} observed ${intervals.length === 1 ? 'interval' : 'intervals'} in days, oldest to newest.`,
              )}
            >
              <div className="cycle-plot-axis" aria-hidden="true">
                <span>
                  {domain.lower} {text('j', 'd')}
                </span>
                <span>
                  {domain.middle} {text('j', 'd')}
                </span>
                <span>
                  {domain.upper} {text('j', 'd')}
                </span>
              </div>
              <ol className="cycle-plot-rows">
                {intervals.map(({ previousStartDate, nextStartDate, durationDays }) => {
                  const position = ((durationDays - domain.lower) / (domain.upper - domain.lower)) * 100
                  return (
                    <li
                      className="cycle-plot-row"
                      key={`${previousStartDate}-${nextStartDate}`}
                      aria-label={text(
                        `${formatCivilDate(previousStartDate, locale)} au ${formatCivilDate(nextStartDate, locale)} : ${durationDays} jours`,
                        `${formatCivilDate(previousStartDate, locale)} to ${formatCivilDate(nextStartDate, locale)}: ${durationDays} days`,
                      )}
                    >
                      <time dateTime={nextStartDate}>{formatCivilDate(nextStartDate, locale)}</time>
                      <span className="cycle-plot-track" aria-hidden="true">
                        <span className="cycle-plot-dot" style={{ left: `${position}%` }} />
                      </span>
                      <strong>
                        {durationDays} {text('j', 'd')}
                      </strong>
                    </li>
                  )
                })}
              </ol>
            </div>
            {history.intervals.length > 6 && (
              <button
                className="stats-history-toggle"
                type="button"
                aria-expanded={showAllIntervals}
                onClick={() => setShowAllIntervals((show) => !show)}
              >
                {showAllIntervals
                  ? text('Afficher les 6 derniers', 'Show the latest 6')
                  : text(
                      `Voir tout l’historique (${history.intervals.length})`,
                      `See all history (${history.intervals.length})`,
                    )}
              </button>
            )}
          </>
        ) : (
          <p className="stats-empty">
            {text(
              'Enregistre un deuxième début passé pour comparer la durée de tes cycles.',
              'Record a second past period start to compare cycle lengths.',
            )}
          </p>
        )}
      </section>

      <section className="stats-section symptom-section" aria-labelledby="stats-symptoms-title">
        <div className="stats-section-heading">
          <div>
            <p className="section-label">{text('Observations saisies', 'Logged observations')}</p>
            <h2 id="stats-symptoms-title">{text('Jour par jour', 'Day by day')}</h2>
          </div>
          {latestPeriods.length > 0 && (
            <p className="stats-observation-count">
              {loggedCount} {text('jours renseignés', 'days logged')}
            </p>
          )}
        </div>

        <p className="stats-description">
          {text(
            'Compare les mêmes jours sur tes 6 dernières périodes. Une case vide signifie « non renseigné », pas « aucun symptôme ».',
            'Compare the same days across your 6 latest periods. A blank cell means “not logged”, not “no symptoms”.',
          )}
        </p>

        {latestPeriods.length > 0 ? (
          <>
            <div className="stats-metric-control">
              <label htmlFor="stats-metric">{text('Afficher', 'Show')}</label>
              <select
                id="stats-metric"
                value={metric}
                onChange={(event) => setMetric(event.target.value as DailyIntensity)}
              >
                {metricOrder.map((key) => (
                  <option key={key} value={key}>
                    {metricLabels[key][locale]}
                  </option>
                ))}
              </select>
            </div>

            {loggedCount === 0 && (
              <p className="stats-empty stats-symptom-empty">
                {text(
                  'Aucune observation notée pour cet indicateur. Tu peux compléter une période depuis Accueil.',
                  'Nothing logged for this measure yet. You can add observations from Home.',
                )}
              </p>
            )}

            <div
              className="symptom-table-scroll"
              tabIndex={0}
              aria-label={text('Tableau défilant des observations', 'Scrollable observations table')}
            >
              <table className="symptom-table">
                <caption className="visually-hidden">
                  {text(
                    `${metricLabels[metric].fr} par jour pour les six dernières périodes enregistrées`,
                    `${metricLabels[metric].en} by day for the six latest recorded periods`,
                  )}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{text('Période', 'Period')}</th>
                    {Array.from({ length: dayCount }, (_, index) => (
                      <th scope="col" key={index + 1}>
                        {text(`J${index + 1}`, `D${index + 1}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestPeriods.map((period) => {
                    const duration = getPeriodDuration(period)
                    return (
                      <tr key={period.startDate}>
                        <th scope="row">
                          <time dateTime={period.startDate}>{formatCivilDate(period.startDate, locale)}</time>
                        </th>
                        {Array.from({ length: dayCount }, (_, index) => {
                          const value = getCellValue(period, index + 1, metric, duration)
                          return (
                            <td
                              key={index + 1}
                              className={`symptom-cell symptom-cell-${value.kind}${value.kind === 'intensity' ? ` symptom-level-${value.value}` : ''}`}
                              aria-label={`${text(`Jour ${index + 1}`, `Day ${index + 1}`)} : ${cellDescription(value, locale)}`}
                            >
                              <span aria-hidden="true">{cellMark(value)}</span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="symptom-legend" aria-label={text('Légende du tableau', 'Table legend')}>
              <li>
                <span className="symptom-legend-level">1/3</span>
              </li>
              <li>
                <span className="symptom-legend-level">2/3</span>
              </li>
              <li>
                <span className="symptom-legend-level">3/3</span>
              </li>
              {metric === 'headacheIntensity' && (
                <>
                  <li>
                    <span className="symptom-legend-level">✓</span>
                    {text('présent', 'present')}
                  </li>
                  <li>
                    <span className="symptom-legend-level">0</span>
                    {text('absent', 'absent')}
                  </li>
                </>
              )}
              <li>
                <span aria-hidden="true">—</span>
                {text('non renseigné', 'not logged')}
              </li>
              <li>
                <span aria-hidden="true">·</span>
                {text('hors durée', 'outside duration')}
              </li>
            </ul>
            <p className="stats-duration-note">
              {text(
                'Les jours après la durée enregistrée sont atténués. Une période ajoutée sans réglage de durée utilise 5 jours par défaut.',
                'Days beyond the recorded duration are muted. Periods added without an edited duration use the 5-day default.',
              )}
            </p>
          </>
        ) : (
          <p className="stats-empty">
            {text(
              'Aucune période passée à comparer. Enregistre un début depuis Accueil pour commencer.',
              'No past periods to compare yet. Record a period start from Home to begin.',
            )}
          </p>
        )}
      </section>
    </div>
  )
}
