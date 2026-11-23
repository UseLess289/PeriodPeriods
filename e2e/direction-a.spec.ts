import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function recordStart(page: Page, startDate: string) {
  await page.getByLabel('Premier jour des règles').fill(startDate)
  await page.getByRole('button', { name: 'Enregistrer le début' }).click()
  await expect(page.locator('.form-feedback-success')).toContainText('Date enregistrée sur cet appareil.')
}

test('keeps estimate context, logging, and calendar markers clear on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date('2025-03-27T12:00:00.000Z') })
  await page.goto('/')

  for (const startDate of ['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-27']) {
    await recordStart(page, startDate)
  }

  const disclaimer = await page.locator('.forecast-disclaimer').boundingBox()
  const saveButton = await page.getByRole('button', { name: 'Enregistrer le début' }).boundingBox()
  const bottomNavigation = await page.locator('.bottom-nav').boundingBox()
  expect(disclaimer).not.toBeNull()
  expect(saveButton).not.toBeNull()
  expect(bottomNavigation).not.toBeNull()
  expect(disclaimer!.y + disclaimer!.height).toBeLessThan(bottomNavigation!.y)
  expect(saveButton!.y + saveButton!.height).toBeLessThan(bottomNavigation!.y)

  const lowConfidenceAccessibility = await new AxeBuilder({ page }).analyze()
  expect(lowConfidenceAccessibility.violations).toEqual([])

  for (const startDate of ['2024-10-08', '2024-11-05', '2024-12-03']) {
    await recordStart(page, startDate)
  }

  await page.getByRole('button', { name: 'Calendrier', exact: true }).click()
  await expect(page.locator('.calendar-legend')).toContainText('Aujourd’hui')
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  const calendar = page.getByRole('table', { name: 'Calendrier pour avril 2025' })
  await expect(calendar.getByLabel(/Date centrale estimée le/)).toBeVisible()
  await expect(page.locator('.calendar-legend')).not.toContainText('Aujourd’hui')
  await expect(page.locator('.calendar-legend')).toContainText('Plage estimée')
  await expect(page.locator('.calendar-legend')).toContainText('Bornes basse et haute')

  const pageWidth = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)

  const calendarAccessibility = await new AxeBuilder({ page }).analyze()
  expect(calendarAccessibility.violations).toEqual([])

  await page.emulateMedia({ colorScheme: 'dark' })
  const darkAccessibility = await new AxeBuilder({ page }).analyze()
  expect(darkAccessibility.violations).toEqual([])

  await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' })
  const highContrastAccessibility = await new AxeBuilder({ page }).analyze()
  expect(highContrastAccessibility.violations).toEqual([])
})
