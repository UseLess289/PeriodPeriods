import { expect, test } from '@playwright/test'

test('enregistre une période complète et la complète depuis la fenêtre de saisie', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const dialog = page.getByRole('dialog', { name: 'Enregistrer une période' })
  await dialog.getByLabel('Début des règles').fill('2025-03-12')
  const duration = dialog.getByRole('slider', { name: 'Durée (jours)' })
  await expect(duration).toHaveValue('5')
  await duration.press('ArrowLeft')
  await dialog.getByLabel('Jour de la période').selectOption('2')
  await dialog.getByRole('spinbutton', { name: 'Flux', exact: true }).press('End')
  await dialog.getByRole('spinbutton', { name: 'Maux de tête' }).press('ArrowUp')
  await dialog.getByRole('spinbutton', { name: 'Crampes' }).press('ArrowUp')
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByLabel('Début enregistré le 12 mars 2025')).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const editing = page.getByRole('dialog')
  await editing.getByLabel('Début des règles').fill('2025-03-12')
  await expect(editing.getByRole('heading', { name: 'Compléter une période' })).toBeVisible()
  await expect(editing.getByLabel('Durée (jours)')).toHaveValue('4')
  await editing.getByLabel('Jour de la période').selectOption('2')
  await expect(editing.getByRole('spinbutton', { name: 'Flux', exact: true })).toHaveAttribute('aria-valuenow', '3')
  await expect(editing.getByRole('spinbutton', { name: 'Maux de tête' })).toHaveAttribute('aria-valuenow', '1')
  await expect(editing.getByRole('spinbutton', { name: 'Crampes' })).toHaveAttribute('aria-valuenow', '1')
  await editing.getByRole('button', { name: 'Annuler' }).click()
})

test('enregistre aujourd’hui avec deux taps au même endroit et exporte les jours relatifs', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')
  const add = page.getByRole('button', { name: 'Ajouter un événement' })
  await expect(add).toBeVisible()
  const bounds = (await add.boundingBox())!
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  await page.mouse.click(x, y)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Début des règles')).toHaveValue('2025-03-20')
  await expect(dialog.getByLabel('Durée (jours)')).toHaveValue('5')
  await expect(dialog.getByRole('button', { name: 'Enregistrer' })).toBeFocused()
  await page.mouse.click(x, y)
  await expect(dialog).toBeHidden()
  await expect(page.locator('.has-period-day')).toHaveCount(5)

  await page.getByRole('button', { name: 'Réglages' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger les données sans dates' }).click()
  expect((await download).suggestedFilename()).toBe('periodperiods-analysis.json')
  await expect(page.getByLabel('Prompt d’analyse')).toHaveValue(/Ne traite pas les données manquantes/)
})

test('importe les jours Flo en conservant les réglages et signale les doublons', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByLabel('Premier jour de la semaine').selectOption('0')
  const input = page.locator('#csv-file-input')
  const flo = JSON.stringify({
    operationalData: {
      cycles: [
        { period_start_date: '2025-01-01', period_end_date: '2025-01-02' },
        { period_start_date: '2025-01-29', period_end_date: '2025-01-30' },
        { period_start_date: '2025-02-26', period_end_date: '2025-02-27' },
      ],
    },
  })
  await input.setInputFiles({ name: 'flo.json', mimeType: 'application/json', buffer: Buffer.from(flo) })
  await expect(page.locator('.backup-action').last()).toContainText('3 période(s) à ajouter depuis Flo.')
  await page.getByRole('button', { name: 'Confirmer l’ajout' }).click()
  await expect(page.getByText('3 période(s) ajoutée(s) depuis Flo.')).toBeVisible()
  await input.setInputFiles({ name: 'flo.json', mimeType: 'application/json', buffer: Buffer.from(flo) })
  await expect(page.getByText(/Débuts déjà présents/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmer l’ajout' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(page.getByText('26 février 2025', { exact: true })).toHaveAttribute('datetime', '2025-02-26')
  await expect(
    page
      .getByRole('table', { name: /Calendrier pour/ })
      .getByRole('columnheader')
      .first(),
  ).toHaveAccessibleName('dimanche')
})

test('la langue anglaise persiste au rechargement', async ({ page }) => {
  await page.goto('/?view=settings')
  await page.getByLabel('Langue').selectOption('en')
  await expect(page.getByRole('heading', { name: 'Local backup' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: 'Home' }).click()
  await expect(page.getByRole('heading', { name: 'Cycle and period tracking' })).toBeVisible()
})
