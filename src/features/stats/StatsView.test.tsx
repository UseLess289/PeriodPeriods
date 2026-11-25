import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addCivilDays } from '../../domain/dates'
import type { CivilDate, Period } from '../../domain/periods'
import { StatsView } from './StatsView'

function makePeriod(
  startDate: CivilDate,
  options: Pick<Period, 'durationDays' | 'dailyLogs'> = { durationDays: 5, dailyLogs: [] },
): Period {
  return {
    id: startDate,
    startDate,
    durationDays: options.durationDays,
    dailyLogs: options.dailyLogs,
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${startDate}T00:00:00.000Z`,
  }
}

describe('StatsView', () => {
  it('shows six recent observed intervals, excludes future dates, and can reveal all', async () => {
    const starts = [
      '2025-01-01',
      '2025-01-29',
      '2025-02-26',
      '2025-03-26',
      '2025-04-24',
      '2025-05-23',
      '2025-06-21',
      '2025-07-20',
      '2025-08-19',
      '2025-09-01',
    ] as CivilDate[]
    const user = userEvent.setup()
    render(<StatsView periods={starts.map((date) => makePeriod(date))} today="2025-08-19" />)

    const plot = screen.getByRole('group', {
      name: '6 intervalles observés, en jours, du plus ancien au plus récent.',
    })
    expect(within(plot).getAllByRole('listitem')).toHaveLength(6)
    expect(within(plot).queryByText('1 septembre 2025')).not.toBeInTheDocument()
    expect(screen.getByText('29 jours')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Voir tout l’historique (8)' }))
    expect(
      within(
        screen.getByRole('group', {
          name: '8 intervalles observés, en jours, du plus ancien au plus récent.',
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Afficher les 6 derniers' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('compares symptom entries by period day and distinguishes missing, absent, and outside-duration values', async () => {
    const periods = [
      makePeriod('2025-01-01', {
        durationDays: 2,
        dailyLogs: [
          { day: 1, flowIntensity: 1, crampsIntensity: 2 },
          { day: 2, flowIntensity: 2, headache: false },
        ],
      }),
      makePeriod('2025-02-01', {
        durationDays: 3,
        dailyLogs: [{ day: 1, flow: 'heavy', crampsIntensity: 3 }],
      }),
    ]
    const user = userEvent.setup()
    render(<StatsView periods={periods} today="2025-02-10" />)

    expect(screen.getByRole('cell', { name: 'Jour 1 : 3 sur 3' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Jour 2 : Non renseigné' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Jour 3 : Hors durée enregistrée' })).toBeInTheDocument()
    expect(screen.getByText('3 jours renseignés')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Afficher'), 'headacheIntensity')
    expect(screen.getByRole('cell', { name: 'Jour 2 : Absent, ancien suivi' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Légende du tableau' })).toHaveTextContent('absent')
  })

  it('explains the cycle and symptom empty states without treating future dates as observations', () => {
    render(
      <StatsView periods={[makePeriod('2025-03-20'), makePeriod(addCivilDays('2025-03-20', 28))]} today="2025-03-20" />,
    )

    expect(screen.getByText(/enregistre un deuxième début passé/i)).toBeInTheDocument()
    expect(screen.getByText(/aucune observation notée pour cet indicateur/i)).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /20 mars 2025/i })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /17 avril 2025/i })).not.toBeInTheDocument()
  })

  it('shows a helpful first-use state when there are no past periods', () => {
    render(<StatsView periods={[makePeriod('2025-04-01')]} today="2025-03-20" />)

    expect(screen.getByText(/aucune période passée à comparer/i)).toBeInTheDocument()
    expect(screen.getByText(/enregistre un deuxième début passé/i)).toBeInTheDocument()
  })
})
