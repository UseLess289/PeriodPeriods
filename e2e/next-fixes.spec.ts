import { expect, test } from '@playwright/test'
import { recordStart } from './record-start'

test('shows phase colors and possible-date halos in the calendar', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-26T12:00:00.000Z') })
  await page.goto('/')

  for (const date of ['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-26']) {
    await recordStart(page, date)
  }

  await page.getByRole('button', { name: 'Mois suivant' }).click()
  const calendar = page.getByRole('table', { name: 'Calendrier pour avril 2025' })
  await expect(calendar).toBeVisible()

  const ovulation = calendar.locator('time[datetime="2025-04-09"]')
  await expect(ovulation).toHaveAttribute('aria-describedby', 'phase-description-2025-04-09')
  await expect(page.locator('#phase-description-2025-04-09')).toContainText('Ovulation estimée')
  await expect(page.locator('#phase-description-2025-04-09')).toContainText('phase folliculaire')
  await expect(page.locator('#phase-description-2025-04-09')).toContainText('phase lutéale')
  await expect(ovulation.locator('xpath=..')).toHaveClass(/phase-expected-ovulatory/)

  const possibleOvulation = calendar.locator('time[datetime="2025-04-07"]')
  await expect(possibleOvulation).toHaveAttribute('aria-describedby', 'phase-description-2025-04-07')
  await expect(page.locator('#phase-description-2025-04-07')).toHaveText(
    'Phase folliculaire estimée; Date possible : ovulation',
  )
  await expect(possibleOvulation.locator('xpath=..')).toHaveClass(/phase-possible-ovulatory/)

  const phaseLegend = page.getByRole('list', { name: 'Phases du cycle' })
  await expect(phaseLegend.getByRole('listitem')).toHaveCount(5)
  await expect(phaseLegend).toContainText('Dates possibles')
})

test('uses equal-width bottom navigation and shows Add only on Home', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const navButtons = page.locator('.bottom-nav .nav-button')
  const addButton = page.getByRole('button', { name: 'Ajouter un événement' })
  const widths = await navButtons.evaluateAll((buttons) =>
    buttons.map((button) => button.getBoundingClientRect().width),
  )
  expect(widths).toHaveLength(3)
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1)
  expect(Math.min(...widths)).toBeGreaterThan(44)
  await expect(addButton).toBeVisible()

  await page.getByRole('button', { name: 'Statistiques' }).click()
  await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeVisible()
  await expect(addButton).toHaveCount(0)

  await page.getByRole('button', { name: 'Réglages' }).click()
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible()
  await expect(addButton).toHaveCount(0)

  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(addButton).toBeVisible()
})

test('uses 1–3 ratings in every event popup intensity wheel', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()

  const dialog = page.getByRole('dialog', { name: 'Enregistrer une période' })
  const wheels = dialog.getByRole('spinbutton')
  await expect(wheels).toHaveCount(4)
  for (const wheel of await wheels.all()) {
    await expect(wheel).toHaveAttribute('aria-valuemin', '0')
    await expect(wheel).toHaveAttribute('aria-valuemax', '3')
    await expect(wheel).toHaveAttribute('aria-valuetext', 'Non renseigné')
  }

  await wheels.first().press('End')
  await expect(wheels.first()).toHaveAttribute('aria-valuenow', '3')
  await expect(wheels.first()).toHaveAttribute('aria-valuetext', '3 / 3')
})
