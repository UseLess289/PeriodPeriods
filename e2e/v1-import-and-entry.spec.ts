import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

async function showDailyDetails(dialog: Locator) {
  const next = dialog.getByRole('button', { name: 'Suivant', exact: true })
  if (await next.isVisible()) {
    await next.click()
    return
  }

  const details = dialog.locator('details')
  if ((await details.count()) && !(await details.evaluate((element: HTMLDetailsElement) => element.open))) {
    await details.locator('summary').click()
  }
}

async function savePeriod(dialog: Locator) {
  const validate = dialog.getByRole('button', { name: 'Valider', exact: true })
  if (await validate.isVisible()) {
    await validate.click()
    return
  }
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
}

async function setIntensity(dialog: Locator, label: string, value: number) {
  const select = dialog.getByRole('combobox', { name: label, exact: true })
  if (await select.isVisible()) {
    await select.selectOption(String(value))
    return
  }

  const wheel = dialog.getByRole('spinbutton', { name: label, exact: true })
  if (value === 0) await wheel.press('Home')
  else if (value === 3) await wheel.press('End')
  else {
    await wheel.press('Home')
    for (let step = 0; step < value; step += 1) await wheel.press('ArrowUp')
  }
}

test('enregistre une période complète et la complète depuis la fenêtre de saisie', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Début des règles').fill('2025-03-12')
  const duration = dialog.getByRole('slider', { name: 'Durée (jours)' })
  await expect(duration).toHaveValue('5')
  await duration.press('ArrowLeft')
  await showDailyDetails(dialog)
  await dialog.getByLabel('Jour de la période').selectOption('2')
  await setIntensity(dialog, 'Flux', 3)
  await setIntensity(dialog, 'Maux de tête', 1)
  await setIntensity(dialog, 'Crampes', 1)
  await savePeriod(dialog)
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Modifier la période commencée le 12 mars 2025, jour 1' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const editing = page.getByRole('dialog')
  await editing.getByLabel('Début des règles').fill('2025-03-12')
  await expect(editing.getByRole('heading', { name: 'Compléter une période' })).toBeVisible()
  await expect(editing.getByLabel('Durée (jours)')).toHaveValue('4')
  await showDailyDetails(editing)
  await editing.getByLabel('Jour de la période').selectOption('2')
  const flow = editing.getByRole('combobox', { name: 'Flux', exact: true })
  const headaches = editing.getByRole('combobox', { name: 'Maux de tête' })
  const cramps = editing.getByRole('combobox', { name: 'Crampes' })
  if (await flow.isVisible()) {
    await expect(flow).toHaveValue('3')
    await expect(headaches).toHaveValue('1')
    await expect(cramps).toHaveValue('1')
  } else {
    await expect(editing.getByRole('spinbutton', { name: 'Flux', exact: true })).toHaveAttribute('aria-valuenow', '3')
    await expect(editing.getByRole('spinbutton', { name: 'Maux de tête' })).toHaveAttribute('aria-valuenow', '1')
    await expect(editing.getByRole('spinbutton', { name: 'Crampes' })).toHaveAttribute('aria-valuenow', '1')
  }
  await editing.getByRole('button', { name: 'Annuler' }).click()
})

test('enregistre aujourd’hui avec le parcours adapté à la largeur et exporte les jours relatifs', async ({ page }) => {
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
  if ((page.viewportSize()?.width ?? 0) <= 480) {
    await expect(dialog.getByRole('heading', { name: 'Enregistrer une période' })).toBeFocused()
    await expect(dialog.getByRole('button', { name: 'Suivant' })).toBeVisible()
  } else {
    await expect(dialog.getByRole('button', { name: 'Enregistrer' })).toBeFocused()
  }
  await page.mouse.click(x, y)
  if ((page.viewportSize()?.width ?? 0) <= 480) {
    await expect(dialog.getByRole('heading', { name: 'Maux et symptômes' })).toBeFocused()
    const day = dialog.getByLabel('Jour de la période')
    await expect(day.locator('option')).toHaveCount(5)
    await expect(day.locator('option').last()).toHaveText(/Jour 5 – 24 mars 2025/)
    await day.selectOption('5')
    await dialog.getByRole('combobox', { name: 'Flux' }).selectOption('3')
    await page.mouse.click(x, y)
  }
  await expect(dialog).toBeHidden()
  await expect(page.locator('.has-period-day')).toHaveCount(5)

  if ((page.viewportSize()?.width ?? 0) <= 480) {
    await add.click()
    const editing = page.getByRole('dialog')
    await editing.getByRole('button', { name: 'Suivant' }).click()
    await editing.getByLabel('Jour de la période').selectOption('5')
    await expect(editing.getByRole('combobox', { name: 'Flux' })).toHaveValue('3')
    await editing.getByRole('button', { name: 'Annuler' }).click()
  }

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
