import { useState } from 'react'
import {
  daysBetweenCivilDates,
  getPeriodDuration,
  type CivilDate,
  type DailyIntensity,
  type Intensity,
  type Period,
  type PeriodDay,
} from '../../domain/periods'
import { getCycleHistory } from '../../domain/history/get-cycle-history'
import { formatCivilDate, type Locale } from '../shared/format-civil-date'
import { PageControls } from '../shared/PageControls'

const daysPerPage = 31
const intervalsPerPage = 36

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
  | { readonly kind: 'future' }
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
  let minimum = values[0]
  let maximum = minimum
  for (const value of values) {
    minimum = Math.min(minimum, value)
    maximum = Math.max(maximum, value)
  }
  const lower = Math.max(0, Math.floor((minimum - 5) / 10) * 10)
  let upper = Math.ceil((maximum + 5) / 10) * 10
  if (upper <= lower) upper = lower + 10
  return { lower, middle: lower + (upper - lower) / 2, upper }
}

function getObservation(entry: PeriodDay | undefined, metric: DailyIntensity): CellValue {
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
  if (value.kind === 'future') return text('Date à venir, non comptée', 'Future date, not counted')
  return text('Non renseigné', 'Not logged')
}

function cellMark(value: CellValue): string {
  if (value.kind === 'intensity') return String(value.value)
  if (value.kind === 'legacy-present') return '✓'
  if (value.kind === 'legacy-absent') return '0'
  if (value.kind === 'outside') return '·'
  if (value.kind === 'future') return '…'
  return '—'
}

export function StatsView({ periods, today, locale = 'fr' }: StatsViewProps) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const history = getCycleHistory(periods, today)
  const [showAllIntervals, setShowAllIntervals] = useState(false)
  const [historyPage, setHistoryPage] = useState(0)
  const [dayPage, setDayPage] = useState(0)
  const [metric, setMetric] = useState<DailyIntensity>('flowIntensity')
  const allIntervals = showAllIntervals ? history.intervals : history.intervals.slice(-6)
  const historyPageCount = Math.ceil(allIntervals.length / intervalsPerPage)
  const currentHistoryPage = Math.min(historyPage, Math.max(0, historyPageCount - 1))
  const historyEnd = allIntervals.length - currentHistoryPage * intervalsPerPage
  const intervals = allIntervals.slice(Math.max(0, historyEnd - intervalsPerPage), historyEnd)
  const intervalValues = allIntervals.map(({ durationDays }) => durationDays)
  const domain = intervalValues.length ? getDomain(intervalValues) : null
  const latestPeriods = periods
    .filter(({ startDate }) => startDate <= today)
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
    .slice(0, 6)
  const laterLoggedDays = new Set<number>()
  const periodRows = latestPeriods.map((period) => {
    const duration = getPeriodDuration(period)
    const elapsedDays = daysBetweenCivilDates(period.startDate, today) + 1
    const observations = new Map<number, CellValue>()
    for (const entry of period.dailyLogs ?? []) {
      if (entry.day > duration || entry.day > elapsedDays) continue
      const observation = getObservation(entry, metric)
      if (observation.kind === 'not-logged') continue
      observations.set(entry.day, observation)
      if (entry.day > daysPerPage) laterLoggedDays.add(entry.day)
    }
    return { period, duration, elapsedDays, observations }
  })
  const loggedCount = periodRows.reduce((sum, { observations }) => sum + observations.size, 0)
  const longestDuration = Math.max(0, ...periodRows.map(({ duration }) => duration))
  const firstPage = Array.from({ length: Math.min(daysPerPage, longestDuration) }, (_, index) => index + 1)
  const laterDays = [...laterLoggedDays].sort((left, right) => left - right)
  const dayPageCount = 1 + Math.ceil(laterDays.length / daysPerPage)
  const currentDayPage = Math.min(dayPage, dayPageCount - 1)
  const visibleDays =
    currentDayPage === 0 ? firstPage : laterDays.slice((currentDayPage - 1) * daysPerPage, currentDayPage * daysPerPage)
  const numberFormat = new Intl.NumberFormat(locale)

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
                onClick={() => {
                  setHistoryPage(0)
                  setShowAllIntervals((show) => !show)
                }}
              >
                {showAllIntervals
                  ? text('Afficher les 6 derniers', 'Show the latest 6')
                  : text(
                      `Voir tout l’historique (${history.intervals.length})`,
                      `See all history (${history.intervals.length})`,
                    )}
              </button>
            )}
            <PageControls
              label={text('Pages des intervalles', 'Interval pages')}
              page={currentHistoryPage}
              count={historyPageCount}
              onPage={setHistoryPage}
              locale={locale}
            />
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
              {loggedCount}{' '}
              {loggedCount === 1 ? text('jour renseigné', 'day logged') : text('jours renseignés', 'days logged')}
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
                onChange={(event) => {
                  setDayPage(0)
                  setMetric(event.target.value as DailyIntensity)
                }}
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
                    {visibleDays.map((day) => (
                      <th scope="col" key={day}>
                        {text(`J${day}`, `D${day}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodRows.map(({ period, duration, elapsedDays, observations }) => {
                    return (
                      <tr key={period.startDate}>
                        <th scope="row">
                          <time dateTime={period.startDate}>{formatCivilDate(period.startDate, locale)}</time>
                          <small className="stats-row-duration">
                            {numberFormat.format(duration)}{' '}
                            {duration === 1 ? text('jour', 'day') : text('jours', 'days')}
                          </small>
                        </th>
                        {visibleDays.map((day) => {
                          const value: CellValue =
                            day > duration
                              ? { kind: 'outside' }
                              : day > elapsedDays
                                ? { kind: 'future' }
                                : (observations.get(day) ?? { kind: 'not-logged' })
                          return (
                            <td
                              key={day}
                              className={`symptom-cell symptom-cell-${value.kind}${value.kind === 'intensity' ? ` symptom-level-${value.value}` : ''}`}
                              aria-label={`${text(`Jour ${day}`, `Day ${day}`)} : ${cellDescription(value, locale)}`}
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
            <PageControls
              label={text('Pages des observations', 'Observation pages')}
              page={currentDayPage}
              count={dayPageCount}
              onPage={setDayPage}
              locale={locale}
            />

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
              <li>
                <span aria-hidden="true">…</span>
                {text('date à venir', 'future date')}
              </li>
            </ul>
            <p className="stats-duration-note">
              {text(
                'La durée indiquée peut être celle par défaut (5 jours). Seules les valeurs saisies pour aujourd’hui ou des dates passées sont comptées.',
                'The length shown may be the 5-day default. Only values logged for today or earlier are counted.',
              )}
              {longestDuration > daysPerPage &&
                ` ${text(
                  'Le tableau montre les 31 premiers jours puis les jours renseignés pour cet indicateur. La durée complète figure à côté du début.',
                  'The table shows the first 31 days, then any later days logged for this measure. The full length appears next to the start.',
                )}`}
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
