import { ChevronRight, LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CivilDate, Period } from '../../domain/periods'
import type { PeriodStartEstimate } from '../../domain/forecast/estimate-next-period'
import { CycleHistoryView } from '../history/CycleHistoryView'
import { formatCivilDate, formatCivilMonthDay, type Locale } from '../shared/format-civil-date'

type PeriodEntryViewProps = {
  readonly locale?: Locale
  periods: Period[]
  estimate: PeriodStartEstimate
  today: CivilDate
  saveMessage: string | null
  onOpenCalendar: () => void
  calendar: ReactNode
}

export function PeriodEntryView({
  periods,
  estimate,
  today,
  saveMessage,
  onOpenCalendar,
  calendar,
  locale = 'fr',
}: PeriodEntryViewProps) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const latestPeriod = periods.at(-1)
  const hasRecordedDates = periods.length > 0

  return (
    <div className="view-stack home-layout" lang={locale}>
      <div className={`home-lead${hasRecordedDates ? ' has-cycle-status' : ''}`}>
        {hasRecordedDates &&
          (estimate.kind === 'insufficient' ? (
            <section className="forecast-empty" aria-labelledby="forecast-empty-title">
              <p className="section-label">{text('Estimation personnelle', 'Personal estimate')}</p>
              <h2 id="forecast-empty-title">{text('Pas encore assez de dates.', 'Not enough dates yet.')}</h2>
              <p>
                {text(
                  'Continue à noter les débuts; une estimation apparaîtra après trois intervalles.',
                  'Keep recording period starts. An estimate will appear after three intervals.',
                )}
              </p>
            </section>
          ) : (
            <ForecastView estimate={estimate} locale={locale} />
          ))}
      </div>

      {calendar}
      <EstimateMethodDetails locale={locale} />

      {latestPeriod ? (
        <section className="latest-period" aria-labelledby="latest-period-title">
          <div>
            <p className="section-label">{text('Historique', 'History')}</p>
            <h2 id="latest-period-title">{text('Dernier début enregistré', 'Last recorded period start')}</h2>
          </div>
          <time className="latest-period-date" dateTime={latestPeriod.startDate}>
            {formatCivilDate(latestPeriod.startDate, locale)}
          </time>
          <button
            className="text-button inline-flex items-center justify-center gap-period-2"
            type="button"
            onClick={onOpenCalendar}
          >
            {text('Ouvrir le calendrier', 'Open calendar')} <ChevronRight size={16} aria-hidden="true" />
          </button>
        </section>
      ) : (
        <section className="first-use-note" aria-labelledby="history-title">
          <div className="note-icon" aria-hidden="true">
            <LockKeyhole size={18} />
          </div>
          <div>
            <h2 id="history-title">{text('Commence par une date.', 'Start with one date.')}</h2>
            <p>
              {text(
                'Plusieurs dates seront nécessaires avant d’afficher une estimation.',
                'You’ll need to record several dates before an estimate can appear.',
              )}
            </p>
          </div>
        </section>
      )}

      <CycleHistoryView periods={periods} today={today} locale={locale} />
      <p className={saveMessage ? 'form-feedback-success' : 'visually-hidden'} role="status">
        {saveMessage}
      </p>
    </div>
  )
}

function EstimateMethodDetails({ locale }: { readonly locale: Locale }) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  return (
    <details className="method-explanation">
      <summary>{text('Comprendre l’estimation', 'How the estimate works')}</summary>
      <div className="method-explanation-copy">
        <p>
          {text(
            'Un intervalle correspond au nombre de jours civils entre deux débuts enregistrés; il ne correspond pas à la durée des règles. Les dates après aujourd’hui ne sont pas prises en compte.',
            'An interval is the number of calendar days between two recorded period starts, not the length of a period. Dates after today are not included.',
          )}
        </p>
        <p>
          {text(
            'Avec moins de trois intervalles, aucune estimation n’est affichée. Avec trois à cinq intervalles, la médiane utilise tous les intervalles disponibles. À partir de six, elle utilise les six plus récents.',
            'No estimate is shown until you have three intervals. With three to five intervals, the median uses all available intervals. With six or more, it uses the six most recent.',
          )}
        </p>
        <p>
          {text(
            'La médiane est la valeur centrale après classement. Si le nombre de durées est pair, c’est la moyenne des deux valeurs centrales. Le résultat est arrondi au jour le plus proche; une demi-journée est arrondie vers le haut.',
            'The median is the middle value when the intervals are sorted. If there is an even number of intervals, it is the average of the two middle values. The result is rounded to the nearest day, with half days rounded up.',
          )}
        </p>
        <p>
          {text(
            'À partir de six intervalles, la plage va du plus court au plus long des mêmes six intervalles récents. Elle est obtenue en ajoutant les durées minimale et maximale au dernier début passé pris en compte. Pour obtenir la date centrale, la médiane arrondie est ajoutée au dernier début passé pris en compte. La plage transpose ces durées observées sans garantir une date future; la date estimée ne se décale pas automatiquement.',
            'With six or more intervals, the range uses the shortest and longest of those same six recent intervals. The earliest and latest dates are calculated by adding those lengths to the last past period start used in the estimate. The middle date is calculated by adding the rounded median to that same start. The range reflects the intervals you recorded and does not guarantee a future date. The estimated date does not shift automatically.',
          )}
        </p>
      </div>
    </details>
  )
}

function ForecastView({
  estimate,
  locale,
}: {
  readonly estimate: Exclude<PeriodStartEstimate, { kind: 'insufficient' }>
  readonly locale: Locale
}) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  return (
    <section className="forecast-section" aria-labelledby="forecast-title">
      <h2 id="forecast-title">{text('Prochain début estimé', 'Estimated next period start')}</h2>
      <p className="forecast-estimate">
        <time className="forecast-date" dateTime={estimate.predictedStartDate}>
          {formatCivilMonthDay(estimate.predictedStartDate, locale)}
        </time>
        <span className="forecast-uncertainty">
          <span aria-hidden="true">
            ± {estimate.uncertaintyDays} {text('j', estimate.uncertaintyDays === 1 ? 'day' : 'days')}
          </span>
          <span className="visually-hidden">
            {text(
              `plus ou moins ${estimate.uncertaintyDays} jours`,
              `plus or minus ${estimate.uncertaintyDays} ${estimate.uncertaintyDays === 1 ? 'day' : 'days'}`,
            )}
          </span>
        </span>
      </p>
    </section>
  )
}
