import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPeriodDataStore } from './data/period-data-store'
import type { PeriodDataStore } from './data/period-data-store'
import App from './App'

describe('PeriodPeriods app', () => {
  let store: PeriodDataStore

  beforeEach(() => {
    store = createPeriodDataStore(`periodperiods-app-${crypto.randomUUID()}`)
  })

  afterEach(() => {
    store.close()
  })

  it('shows the first-use form with today prefilled and the three main destinations', async () => {
    render(<App store={store} today="2025-03-20" />)

    expect(await screen.findByLabelText('Premier jour des règles')).toHaveValue('2025-03-20')
    expect(screen.getByRole('heading', { name: 'Suivi des règles et du cycle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer le début' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Calendrier' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réglages' })).toBeInTheDocument()
    expect(screen.getByText(/plusieurs dates seront nécessaires/i)).toBeInTheDocument()
  })

  it('records a past start and shows it on the home view', async () => {
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    const dateInput = await screen.findByLabelText('Premier jour des règles')
    fireEvent.change(dateInput, { target: { value: '2025-03-12' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer le début' }))

    expect(await screen.findByText('Date enregistrée sur cet appareil.')).toHaveAttribute('role', 'status')
    expect(screen.getByText('Dernier début enregistré')).toBeInTheDocument()
    expect(screen.getByText('12 mars 2025')).toHaveAttribute('datetime', '2025-03-12')
    await expect(store.getPeriods()).resolves.toMatchObject([{ startDate: '2025-03-12' }])
  })

  it('submits the date form from the keyboard', async () => {
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    const dateInput = await screen.findByLabelText('Premier jour des règles')
    fireEvent.change(dateInput, { target: { value: '2025-03-12' } })
    dateInput.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Date enregistrée sur cet appareil.')).toHaveAttribute('role', 'status')
    await expect(store.getPeriods()).resolves.toMatchObject([{ startDate: '2025-03-12' }])
  })

  it('rejects a future date without clearing the form', async () => {
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    const dateInput = await screen.findByLabelText('Premier jour des règles')
    fireEvent.change(dateInput, { target: { value: '2025-03-21' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer le début' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/ne peut pas être dans le futur/i)
    expect(dateInput).toHaveValue('2025-03-21')
    expect(dateInput).toHaveAttribute('aria-invalid', 'true')
    expect(dateInput).toHaveFocus()
    await expect(store.getPeriods()).resolves.toEqual([])
  })

  it('asks for a date and focuses the field when the form is submitted empty', async () => {
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    const dateInput = await screen.findByLabelText('Premier jour des règles')
    fireEvent.change(dateInput, { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer le début' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/choisis une date de début/i)
    expect(dateInput).toHaveAttribute('aria-invalid', 'true')
    expect(dateInput).toHaveFocus()
    await expect(store.getPeriods()).resolves.toEqual([])
  })

  it('explains a duplicate start and preserves the date', async () => {
    await store.addPeriod({ startDate: '2025-03-12' })
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    const dateInput = await screen.findByLabelText('Premier jour des règles')
    fireEvent.change(dateInput, { target: { value: '2025-03-12' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer le début' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/déjà enregistré/i)
    expect(dateInput).toHaveValue('2025-03-12')
    expect(dateInput).toHaveFocus()
    expect(dateInput).toHaveAttribute('aria-invalid', 'true')
    expect(dateInput).toHaveAttribute('aria-describedby', 'period-start-hint period-start-error')
    await expect(store.getPeriods()).resolves.toHaveLength(1)
  })

  it('keeps the form available after a storage error and can retry', async () => {
    const originalAdd = store.addPeriod.bind(store)
    const addPeriod = vi.spyOn(store, 'addPeriod').mockRejectedValueOnce(new Error('IndexedDB unavailable'))
    addPeriod.mockImplementation(originalAdd)
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    const dateInput = await screen.findByLabelText('Premier jour des règles')
    fireEvent.change(dateInput, { target: { value: '2025-03-12' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer le début' }))

    expect(await screen.findByText(/enregistrement a échoué/i)).toHaveAttribute('role', 'alert')
    expect(dateInput).toHaveValue('2025-03-12')
    expect(dateInput).toHaveFocus()
    expect(dateInput).not.toHaveAttribute('aria-invalid', 'true')

    await user.click(screen.getByRole('button', { name: 'Enregistrer le début' }))
    expect(await screen.findByText('Date enregistrée sur cet appareil.')).toHaveAttribute('role', 'status')
    expect(addPeriod).toHaveBeenCalledTimes(2)
  })

  it('retries when the local data cannot be loaded', async () => {
    const originalGetPeriods = store.getPeriods.bind(store)
    const getPeriods = vi.spyOn(store, 'getPeriods').mockRejectedValueOnce(new Error('IndexedDB unavailable'))
    getPeriods.mockImplementation(originalGetPeriods)
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/impossible de charger/i)
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByLabelText('Premier jour des règles')).toBeInTheDocument()
    await waitFor(() => expect(getPeriods).toHaveBeenCalledTimes(2))
  })

  it('shows recorded start dates in the current month with the saved week start', async () => {
    await store.addPeriod({ startDate: '2025-03-12' })
    await store.addPeriod({ startDate: '2025-03-25' })
    await store.saveSettings({ forecastMethod: 'median-6', firstDayOfWeek: 0 })
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    await user.click(await screen.findByRole('button', { name: 'Calendrier' }))

    const calendar = screen.getByRole('table', { name: 'Calendrier pour mars 2025' })
    expect(within(calendar).getByLabelText('Début enregistré le 12 mars 2025')).toBeInTheDocument()
    expect(
      within(calendar).getByLabelText('Début enregistré pour une date à venir le 25 mars 2025'),
    ).toBeInTheDocument()
    expect(within(calendar).getAllByRole('columnheader')[0]).toHaveAccessibleName('dimanche')
  })

  it('moves between months and offers a route back to period entry when empty', async () => {
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    await screen.findByLabelText('Premier jour des règles')
    await user.click(await screen.findByRole('button', { name: 'Calendrier' }))
    expect(screen.getByRole('table', { name: 'Calendrier pour mars 2025' })).toBeInTheDocument()
    expect(screen.getByText(/aucune date de début enregistrée pour ce mois/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mois précédent' }))
    expect(screen.getByRole('table', { name: 'Calendrier pour février 2025' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByRole('table', { name: 'Calendrier pour mars 2025' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ajouter une date' }))
    expect(screen.getByLabelText('Premier jour des règles')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows a low-confidence median after three intervals and marks the estimate in the calendar', async () => {
    for (const startDate of ['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-26']) {
      await store.addPeriod({ startDate })
    }
    await store.addPeriod({ startDate: '2025-04-01' })
    await store.saveSettings({ forecastMethod: 'weighted', firstDayOfWeek: 1 })
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-26" />)

    expect(await screen.findByRole('heading', { name: 'Prochain début estimé' })).toBeInTheDocument()
    expect(screen.getByText('23 avril 2025')).toHaveAttribute('datetime', '2025-04-23')
    expect(screen.getByText(/confiance faible/i)).toBeInTheDocument()
    expect(screen.getByText(/pas une certitude|ni une certitude/i)).toBeInTheDocument()
    expect(screen.getByText(/méthode contraceptive/i)).toBeInTheDocument()
    expect(screen.getByText(/dates après aujourd’hui.*n’entrent pas dans ce calcul/i)).toBeInTheDocument()

    await user.click(screen.getByText('Comprendre l’estimation'))
    expect(
      screen.getByText(/trois à cinq intervalles, la médiane utilise tous les intervalles disponibles/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Calendrier' }))
    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
    const calendar = screen.getByRole('table', { name: 'Calendrier pour avril 2025' })
    expect(within(calendar).getByLabelText('Date centrale estimée le 23 avril 2025')).toBeInTheDocument()
  })

  it('explains why an estimate is not available with fewer than three intervals', async () => {
    for (const startDate of ['2025-01-01', '2025-01-29', '2025-02-26']) {
      await store.addPeriod({ startDate })
    }
    render(<App store={store} today="2025-03-01" />)

    expect(await screen.findByRole('heading', { name: 'Pas encore assez de dates.' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Prochain début estimé' })).not.toBeInTheDocument()
    expect(screen.getByText(/après trois intervalles/i)).toBeInTheDocument()
  })

  it('shows the empty history state when fewer than two past starts are available', async () => {
    await store.addPeriod({ startDate: '2025-03-12' })
    render(<App store={store} today="2025-03-20" />)

    expect(await screen.findByRole('heading', { name: 'Historique des intervalles' })).toBeInTheDocument()
    expect(screen.getByText(/une autre date passée est nécessaire/i)).toBeInTheDocument()
  })

  it('explains an empty past history when only future starts are recorded', async () => {
    await store.addPeriod({ startDate: '2025-03-21' })
    render(<App store={store} today="2025-03-20" />)

    expect(await screen.findByText(/enregistre deux débuts passés/i)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Intervalles entre les débuts enregistrés' })).not.toBeInTheDocument()
    const futureStarts = screen.getByRole('list', { name: 'Dates enregistrées à venir' })
    expect(within(futureStarts).getByText('21 mars 2025')).toHaveAttribute('datetime', '2025-03-21')
    expect(screen.queryByRole('heading', { name: 'Prochain début estimé' })).not.toBeInTheDocument()
  })

  it('shows observed intervals in order and separates future recorded dates', async () => {
    for (const startDate of ['2025-03-27', '2025-01-29', '2025-04-24', '2025-02-26', '2025-01-01']) {
      await store.addPeriod({ startDate })
    }
    render(<App store={store} today="2025-03-27" />)

    const intervals = await screen.findByRole('list', { name: 'Intervalles entre les débuts enregistrés' })
    const rows = within(intervals).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('1 janvier 2025 au 29 janvier 2025')
    expect(rows[0]).toHaveTextContent('28 jours')
    expect(rows[2]).toHaveTextContent('26 février 2025 au 27 mars 2025')
    expect(rows[2]).toHaveTextContent('29 jours')
    expect(screen.getByText(/3 intervalles observés/i)).toBeInTheDocument()
    expect(screen.getByText(/de 28 à 29 jours/i)).toBeInTheDocument()
    expect(screen.getByText(/jours entre deux débuts successifs, pas la durée des règles/i)).toBeInTheDocument()

    const futureStarts = screen.getByRole('list', { name: 'Dates enregistrées à venir' })
    expect(within(futureStarts).getByText('24 avril 2025')).toHaveAttribute('datetime', '2025-04-24')
    expect(within(futureStarts).getByText(/ne contribue pas aux intervalles/i)).toBeInTheDocument()
  })

  it('explains the existing estimate rules in a keyboard-operable disclosure', async () => {
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    const explanation = await screen.findByText('Comprendre l’estimation')
    expect(explanation.closest('details')).not.toHaveAttribute('open')
    await user.click(explanation)

    expect(explanation.closest('details')).toHaveAttribute('open')
    expect(screen.getByText(/moins de trois intervalles, aucune estimation/i)).toBeInTheDocument()
    expect(screen.getByText(/trois à cinq intervalles, la médiane utilise tous les intervalles/i)).toBeInTheDocument()
    expect(screen.getByText(/à partir de six, elle utilise les six plus récents/i)).toBeInTheDocument()
    expect(screen.getByText(/valeur centrale après classement/i)).toBeInTheDocument()
    expect(screen.getByText(/médiane arrondie est ajoutée au dernier début passé pris en compte/i)).toBeInTheDocument()
    expect(screen.getByText(/durées minimale et maximale au dernier début passé/i)).toBeInTheDocument()
  })

  it('shows the six-cycle range and marks its bounds separately from the median', async () => {
    for (const startDate of [
      '2025-01-01',
      '2025-03-02',
      '2025-03-30',
      '2025-04-27',
      '2025-05-26',
      '2025-06-25',
      '2025-07-26',
      '2025-08-27',
    ]) {
      await store.addPeriod({ startDate })
    }
    const user = userEvent.setup()
    render(<App store={store} today="2025-08-27" />)

    expect(await screen.findByText('26 septembre 2025')).toHaveAttribute('datetime', '2025-09-26')
    expect(screen.getByText(/24 au 28 septembre 2025/i)).toBeInTheDocument()
    expect(screen.getByText(/du plus court au plus long des six derniers intervalles/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Calendrier' }))
    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
    const calendar = screen.getByRole('table', { name: 'Calendrier pour septembre 2025' })
    expect(within(calendar).getByLabelText('Borne basse de la plage estimée le 24 septembre 2025')).toBeInTheDocument()
    expect(within(calendar).getByLabelText('Date centrale estimée le 26 septembre 2025')).toBeInTheDocument()
    expect(within(calendar).getByLabelText('Borne haute de la plage estimée le 28 septembre 2025')).toBeInTheDocument()
  })

  it('keeps a passed estimate visible without shifting it forward', async () => {
    for (const startDate of ['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-26']) {
      await store.addPeriod({ startDate })
    }
    render(<App store={store} today="2025-04-25" />)

    expect(await screen.findByText('23 avril 2025')).toHaveAttribute('datetime', '2025-04-23')
    expect(screen.getByText(/date centrale estimée est passée/i)).toBeInTheDocument()
  })

  it('changes destination with the keyboard and moves focus to its heading', async () => {
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    const dateInput = await screen.findByLabelText('Premier jour des règles')
    const navigation = screen.getByRole('navigation', { name: 'Navigation principale' })
    const calendarButton = within(navigation).getByRole('button', { name: 'Calendrier' })

    await user.tab()
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toHaveFocus()
    await user.tab()
    expect(dateInput).toHaveFocus()
    await user.click(calendarButton)

    const calendarHeading = screen.getByRole('heading', { name: 'Calendrier' })
    expect(calendarHeading).toHaveFocus()
    expect(calendarButton).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('table', { name: /calendrier pour/i })).toBeInTheDocument()
  })

  it('shows the settings destination as current when selected', async () => {
    const user = userEvent.setup()
    render(<App store={store} today="2025-03-20" />)

    await screen.findByLabelText('Premier jour des règles')
    const navigation = screen.getByRole('navigation', { name: 'Navigation principale' })
    const settingsButton = within(navigation).getByRole('button', { name: 'Réglages' })
    await user.click(settingsButton)

    expect(settingsButton).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'Réglages' })).toHaveFocus()
    expect(
      await screen.findByRole('heading', { name: 'Les options ne sont pas encore disponibles.' }),
    ).toBeInTheDocument()
  })
})
