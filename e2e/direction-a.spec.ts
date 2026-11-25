import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { recordStart } from './record-start'

test('keeps estimate context, logging, and calendar markers clear on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date('2025-03-27T12:00:00.000Z') })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  for (const startDate of ['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-27']) {
    await recordStart(page, startDate)
  }

  const forecast = await page.locator('.forecast-section').boundingBox()
  const saveButton = await page.getByRole('button', { name: 'Ajouter un événement' }).boundingBox()
  const bottomNavigation = await page.locator('.bottom-nav').boundingBox()
  expect(forecast).not.toBeNull()
  await expect(page.locator('.forecast-estimate')).toContainText('± 1 j')
  await expect(page.locator('.forecast-disclaimer')).toHaveCount(0)
  expect(saveButton).not.toBeNull()
  expect(bottomNavigation).not.toBeNull()
  expect(forecast!.y + forecast!.height).toBeLessThan(bottomNavigation!.y)
  expect(saveButton!.y + saveButton!.height).toBeLessThan(bottomNavigation!.y)

  const lowConfidenceAccessibility = await new AxeBuilder({ page }).analyze()
  expect(lowConfidenceAccessibility.violations).toEqual([])

  for (const startDate of ['2024-10-08', '2024-11-05', '2024-12-03']) {
    await recordStart(page, startDate)
  }

  const calendarLegend = page.getByRole('list', { name: 'Légende du calendrier' })
  await expect(calendarLegend).toContainText('Aujourd’hui')
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  const calendar = page.getByRole('table', { name: 'Calendrier pour avril 2025' })
  await expect(calendar.getByLabel(/Date centrale estimée le/)).toBeVisible()
  await expect(calendarLegend).not.toContainText('Aujourd’hui')
  await expect(calendarLegend).toContainText('Plage estimée')
  await expect(calendarLegend).toContainText('Bornes basse et haute')

  const pageWidth = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)

  const calendarAccessibility = await new AxeBuilder({ page }).analyze()
  expect(calendarAccessibility.violations).toEqual([])

  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByRole('button', { name: 'Passer au thème sombre' }).click()
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const darkAccessibility = await new AxeBuilder({ page }).analyze()
  expect(darkAccessibility.violations).toEqual([])

  await page.emulateMedia({ contrast: 'more' })
  const highContrastAccessibility = await new AxeBuilder({ page }).analyze()
  expect(highContrastAccessibility.violations).toEqual([])

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
