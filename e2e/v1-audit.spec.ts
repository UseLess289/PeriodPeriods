import { expect, test, type Locator } from '@playwright/test'
import { recordStart } from './record-start'

async function submitPeriod(dialog: Locator) {
  const next = dialog.getByRole('button', { name: 'Suivant', exact: true })
  if (await next.isVisible()) {
    await next.click()
    await dialog.getByRole('button', { name: 'Valider', exact: true }).click()
  } else {
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  }
}

test('corrects by identity, rejects a collision and only deletes after dated confirmation', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2025-03-20T12:00:00Z'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Réglages' }).click()
  const timestamp = '2025-03-01T12:00:00.000Z'
  const fixture = {
    version: 2,
    periods: [
      {
        id: 'audit-original',
        startDate: '2025-03-12',
        durationDays: 5,
        dailyLogs: [{ day: 2, flowIntensity: 3 }],
        note: 'Synthetic audit fixture',
        symptoms: ['Synthetic symptom'],
        flow: 'medium',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      ...['2025-01-01', '2025-01-29', '2025-02-26'].map((startDate) => ({
        id: startDate,
        startDate,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    ],
    settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
  }
  await page.getByLabel('Fichier de sauvegarde JSON').setInputFiles({
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.getByText(/Sauvegarde importée/)).toBeVisible()
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(page.getByRole('heading', { name: 'Prochain début estimé' })).toBeVisible()

  const original = page.getByRole('button', {
    name: 'Modifier la période du 12 mars 2025 (débutée le 12 mars 2025)',
  })
  await original.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Début des règles').fill('2025-02-26')
  await submitPeriod(dialog)
  await expect(dialog.getByRole('alert')).toContainText(/déjà enregistré/)
  const back = dialog.getByRole('button', { name: 'Retour à la période' })
  if (await back.isVisible()) await back.click()
  await expect(dialog.getByLabel('Début des règles')).toHaveValue('2025-02-26')
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(original).toBeFocused()

  await original.click()
  await dialog.getByLabel('Début des règles').fill('2025-03-14')
  await submitPeriod(dialog)
  await expect(dialog).toBeHidden()
  await expect(original).toHaveCount(0)
  const corrected = page.getByRole('button', {
    name: 'Modifier la période du 14 mars 2025 (débutée le 14 mars 2025)',
  })
  await corrected.click()
  await dialog.getByRole('button', { name: 'Supprimer cette période' }).click()
  await expect(dialog).toContainText('14 mars 2025')
  await expect(dialog.getByRole('button', { name: 'Garder la période' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog.getByRole('button', { name: 'Supprimer cette période' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(corrected).toBeFocused()

  await page.getByRole('button', { name: 'Réglages' }).click()
  const exportBackup = async () => {
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Télécharger la sauvegarde' }).click()
    const stream = await (await pending).createReadStream()
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return JSON.parse(Buffer.concat(chunks).toString())
  }
  const moved = await exportBackup()
  expect(moved.periods).toHaveLength(4)
  expect(moved.periods.find(({ id }: { id: string }) => id === 'audit-original')).toMatchObject({
    ...fixture.periods[0],
    startDate: '2025-03-14',
    updatedAt: '2025-03-20T12:00:00.000Z',
  })
  await page.getByRole('button', { name: 'Accueil' }).click()
  await corrected.click()
  await dialog.getByRole('button', { name: 'Supprimer cette période' }).click()
  await dialog.getByRole('button', { name: 'Confirmer la suppression' }).click()
  await expect(dialog).toBeHidden()
  await expect(corrected).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Pas encore assez de dates.' })).toBeVisible()
  await page.getByRole('button', { name: 'Statistiques' }).click()
  await expect(page.getByRole('group', { name: /2 intervalles observés/ })).toBeVisible()
  await page.getByRole('button', { name: 'Réglages' }).click()
  expect((await exportBackup()).periods.map(({ id }: { id: string }) => id)).toEqual([
    '2025-01-01',
    '2025-01-29',
    '2025-02-26',
  ])
})

test('legacy Calendar link opens Statistics and back/forward retains the correct destinations', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2025-03-20T12:00:00Z'))
  await page.goto('/?view=calendar')
  const add = page.getByRole('button', { name: 'Ajouter un événement' })
  await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeVisible()
  await expect(add).toHaveCount(0)
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(add).toBeVisible()
  await page.getByRole('button', { name: 'Mois précédent' }).click()
  await expect(page.getByRole('heading', { name: 'Février 2025' })).toBeVisible()
  await page.getByRole('button', { name: 'Réglages' }).click()
  await expect(add).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Mars 2025' })).toBeVisible()
  await expect(add).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeVisible()
  await expect(page).toHaveURL(/\?view=calendar$/)
  await page.goForward()
  await expect(add).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible()
  await expect(page.getByText(/projection annuelle/i)).toHaveCount(0)
})

test('midnight and resume update Add, validation, today and a passed forecast without reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-31T23:50:00Z') })
  await page.goto('/')
  for (const date of ['2025-01-06', '2025-02-03', '2025-03-03', '2025-03-31']) await recordStart(page, date)
  await expect(page.locator('time[aria-current="date"]')).toHaveAttribute('datetime', '2025-03-31')
  await page.clock.fastForward(11 * 60 * 1000)
  await expect(page.getByRole('heading', { name: 'Avril 2025' })).toBeVisible()
  await expect(page.locator('time[aria-current="date"]')).toHaveAttribute('datetime', '2025-04-01')
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Début des règles')).toHaveValue('2025-04-01')
  await dialog.getByLabel('Début des règles').fill('2025-04-02')
  const next = dialog.getByRole('button', { name: 'Suivant', exact: true })
  if (await next.isVisible()) await next.click()
  else await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('ne dépasse pas aujourd’hui')
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.setSystemTime(new Date('2025-04-29T09:00:00Z'))
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByText('Estimation passée', { exact: true })).toBeVisible()
  await expect(page.locator('time[aria-current="date"]')).toHaveAttribute('datetime', '2025-04-29')
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  await expect(dialog.getByLabel('Début des règles')).toHaveValue('2025-04-29')
  await expect(dialog.getByLabel('Début des règles')).toHaveAttribute('max', '2025-04-29')
})

test.describe('local date outside UTC', () => {
  test.use({ timezoneId: 'America/New_York' })

  test('uses New York midnight rather than the UTC day boundary', async ({ page }) => {
    await page.clock.install({ time: new Date('2025-04-01T03:55:00Z') })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Mars 2025' })).toBeVisible()
    await expect(page.locator('time[aria-current="date"]')).toHaveAttribute('datetime', '2025-03-31')
    await page.clock.fastForward(6 * 60 * 1000)
    await expect(page.getByRole('heading', { name: 'Avril 2025' })).toBeVisible()
    await page.getByRole('button', { name: 'Ajouter un événement' }).click()
    await expect(page.getByLabel('Début des règles')).toHaveValue('2025-04-01')
    await expect(page.getByLabel('Début des règles')).toHaveAttribute('max', '2025-04-01')
  })
})

test('highlights actual observations, not unlogged duration days or future logs, and hides incoherent phase markers', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2025-03-20T12:00:00Z'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/5 jours est une hypothèse/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
  await page.getByRole('button', { name: 'Réglages' }).click()
  const timestamp = '2025-03-01T12:00:00.000Z'
  await page.getByLabel('Fichier de sauvegarde JSON').setInputFiles({
    name: 'synthetic-observations.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        periods: [
          { id: 'legacy', startDate: '2025-03-02', endDate: '2025-03-04' },
          { id: 'unknown', startDate: '2025-03-08' },
          { id: 'short-cycle', startDate: '2025-03-12', durationDays: 2 },
          {
            id: 'latest',
            startDate: '2025-03-18',
            durationDays: 5,
            dailyLogs: [{ day: 2, headache: false }, { day: 3 }, { day: 4, flowIntensity: 3 }],
          },
        ].map((period) => ({ ...period, createdAt: timestamp, updatedAt: timestamp })),
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      }),
    ),
  })
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.getByText(/Sauvegarde importée/)).toBeVisible()
  await page.getByRole('button', { name: 'Accueil' }).click()
  for (const day of [3, 9, 13, 20]) {
    await expect(
      page.getByRole('button', { name: new RegExp(`Modifier la période du ${day} mars`) }),
    ).toHaveAccessibleDescription(/durée indicative, sans observation/)
  }
  const observed = page.getByRole('button', { name: /Modifier la période du 19 mars/ })
  await expect(observed).toHaveAccessibleDescription(/Observation quotidienne saisie/)
  const futureDurationGuide = page.getByRole('button', { name: /Modifier la période du 21 mars/ })
  await expect(futureDurationGuide).toHaveAccessibleDescription(/durée indicative, sans observation/)
  await expect(futureDurationGuide).not.toHaveAccessibleDescription(/Observation quotidienne saisie/)
  await expect(page.locator('.has-duration-guide')).not.toHaveCount(0)
  await expect(page.locator('.is-ovulation-peak, .phase-possible-ovulatory')).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Phases estimées du cycle' })).not.toContainText(/ovulation/i)

  await page.getByRole('button', { name: 'Statistiques' }).click()
  await expect(page.getByRole('cell', { name: 'Jour 4 : Date à venir, non comptée' }).first()).toBeVisible()
  await page.getByLabel('Afficher').selectOption('headacheIntensity')
  await expect(page.getByRole('cell', { name: 'Jour 2 : Absent, ancien suivi' })).toBeVisible()
})

test('restores and re-exports a huge duration while keeping Home and Statistics bounded', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2025-03-20T12:00:00Z'))
  await page.goto('/?view=settings')
  const timestamp = '2025-03-01T12:00:00.000Z'
  const giant = {
    id: 'giant',
    startDate: '2025-01-10',
    durationDays: Number.MAX_SAFE_INTEGER,
    dailyLogs: [
      { day: 40, flowIntensity: 2 },
      { day: Number.MAX_SAFE_INTEGER, flowIntensity: 3 },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await page.getByLabel('Fichier de sauvegarde JSON').setInputFiles({
    name: 'synthetic-giant.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        periods: ['2025-01-01', '2025-01-04', '2025-01-07']
          .map((startDate) => ({
            id: startDate,
            startDate,
            createdAt: timestamp,
            updatedAt: timestamp,
          }))
          .concat(giant),
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      }),
    ),
  })
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.getByText(/Sauvegarde importée/)).toBeVisible()
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(page.getByRole('table', { name: 'Calendrier pour mars 2025' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Phases estimées du cycle' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Statistiques' }).click()
  const table = page.getByRole('table')
  await expect(table.getByRole('columnheader')).toHaveCount(32)
  await expect(table.getByText(`${new Intl.NumberFormat('fr').format(Number.MAX_SAFE_INTEGER)} jours`)).toBeVisible()
  await expect(page.getByText('1 jour renseigné')).toBeVisible()
  await page
    .getByRole('group', { name: 'Pages des observations' })
    .getByRole('button', { name: 'Page suivante' })
    .click()
  await expect(table.getByRole('columnheader')).toHaveCount(2)
  await expect(table.getByRole('cell', { name: 'Jour 40 : 2 sur 3' })).toBeVisible()
  await page.getByRole('button', { name: 'Réglages' }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger la sauvegarde' }).click()
  const stream = await (await pending).createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  expect(JSON.parse(Buffer.concat(chunks).toString()).periods.at(-1)).toEqual(giant)
})

test('a newer CSV wins over a delayed backup and oversized Flo files are never read', async ({ page }) => {
  await page.addInitScript(() => {
    const originalText = File.prototype.text
    File.prototype.text = function () {
      if (this.name === 'too-large.json') document.documentElement.dataset.oversizedFileRead = 'true'
      if (this.name !== 'slow-backup.json') return originalText.call(this)
      return new Promise<string>((resolve, reject) => {
        document.addEventListener(
          'audit-release-file',
          () => {
            void originalText.call(this).then((value) => {
              resolve(value)
              document.documentElement.dataset.delayedFileReleased = 'true'
            }, reject)
          },
          { once: true },
        )
      })
    }
  })
  await page.goto('/?view=settings')
  const replacement = page.getByLabel('Fichier de sauvegarde JSON')
  const additions = page.getByLabel('Fichier Flo JSON ou CSV')
  await replacement.setInputFiles({
    name: 'slow-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":2,"periods":[],"settings":{"firstDayOfWeek":1,"forecastMethod":"median-6"}}'),
  })
  await expect(page.getByText('Lecture du fichier…')).toBeVisible()
  await additions.setInputFiles({
    name: 'newest.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('startDate,note\n2025-03-03,Synthetic race winner'),
  })
  await expect(page.getByText('newest.csv')).toBeVisible()
  await expect(page.getByText('Dates couvertes : 3 mars 2025')).toBeVisible()
  await page.evaluate(() => document.dispatchEvent(new Event('audit-release-file')))
  await expect(page.locator('html')).toHaveAttribute('data-delayed-file-released', 'true')
  await expect(page.getByRole('button', { name: 'Remplacer les données actuelles' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirmer l’ajout' }).click()
  await expect(page.getByText('1 période(s) ajoutée(s) depuis le CSV.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remplacer les données actuelles' })).toHaveCount(0)

  await additions.setInputFiles({
    name: 'too-large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  })
  await expect(page.getByRole('alert')).toContainText('limite de 10 Mio')
  await expect(page.locator('html')).not.toHaveAttribute('data-oversized-file-read', 'true')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger la sauvegarde' }).click()
  const stream = await (await pending).createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  expect(JSON.parse(Buffer.concat(chunks).toString()).periods).toMatchObject([
    { startDate: '2025-03-03', note: 'Synthetic race winner' },
  ])
})

test('larger histories remain navigable without mounting every interval at once', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2025-03-20T12:00:00Z'))
  await page.goto('/?view=settings')
  const timestamp = '2025-01-01T00:00:00.000Z'
  const periods = Array.from({ length: 73 }, (_, index) => {
    const startDate = new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10)
    return { id: startDate, startDate, createdAt: timestamp, updatedAt: timestamp }
  })
  await page.getByLabel('Fichier de sauvegarde JSON').setInputFiles({
    name: 'synthetic-long-history.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        periods,
        settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
      }),
    ),
  })
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.getByText(/Sauvegarde importée/)).toBeVisible()
  await page.getByRole('button', { name: 'Accueil' }).click()
  const rows = page.getByRole('list', { name: 'Intervalles entre les débuts enregistrés' }).getByRole('listitem')
  await expect(rows).toHaveCount(48)
  const paging = page.getByRole('group', { name: 'Pages des intervalles' })
  await paging.getByRole('button', { name: 'Page suivante' }).click()
  await expect(rows).toHaveCount(24)
  await expect(rows.last()).toContainText('1 janvier 2025')
  await page.getByRole('button', { name: 'Statistiques' }).click()
  await page.getByRole('button', { name: 'Voir tout l’historique (72)' }).click()
  await expect(page.getByRole('group', { name: /^36 intervalles observés/ }).getByRole('listitem')).toHaveCount(36)
  await page
    .getByRole('group', { name: 'Pages des intervalles' })
    .getByRole('button', { name: 'Page suivante' })
    .click()
  await expect(
    page
      .getByRole('group', { name: /^36 intervalles observés/ })
      .getByRole('listitem')
      .first(),
  ).toHaveAccessibleName(/1 janvier 2025/)
})
