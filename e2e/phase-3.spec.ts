import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { recordStart } from './record-start'

async function importStartDates(page: Page, startDates: string[]) {
  const createdAt = '2025-01-01T00:00:00.000Z'
  const backup = {
    version: 1,
    periods: startDates.map((startDate, index) => ({
      id: `seed-${index + 1}`,
      startDate,
      createdAt,
      updatedAt: createdAt,
    })),
    settings: { forecastMethod: 'median-6', firstDayOfWeek: 1 },
  }
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.locator('#period-backup-file').setInputFiles({
    name: 'seed.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  await expect(page.getByRole('heading', { name: 'Aperçu de la sauvegarde' })).toBeVisible()
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.locator('#backup-import-status')).toContainText('Sauvegarde importée.')
  await page.getByRole('button', { name: 'Accueil' }).click()
}

test('présente l’historique complet et explique la médiane sur un petit écran', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-06-30T12:00:00.000Z') })
  await page.goto('/')

  await importStartDates(page, [
    '2025-01-01',
    '2025-01-29',
    '2025-02-26',
    '2025-03-27',
    '2025-04-25',
    '2025-05-24',
    '2025-06-22',
    '2025-06-30',
  ])

  const history = page.getByRole('list', { name: 'Intervalles entre les débuts enregistrés' })
  await expect(history.getByRole('listitem')).toHaveCount(7)
  await expect(page.getByText('7 intervalles observés')).toBeVisible()
  await expect(page.getByText(/de 8 à 29 jours/i)).toBeVisible()
  await expect(page.locator('.forecast-date')).toHaveAttribute('datetime', '2025-07-29')

  const methodSummary = page.getByText('Comprendre l’estimation')
  await methodSummary.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('details')).toHaveAttribute('open', '')
  await expect(page.getByText(/À partir de six, elle utilise les six plus récents/i)).toBeVisible()
  await expect(page.getByText(/médiane arrondie est ajoutée au dernier début passé/i)).toBeVisible()

  await page.setViewportSize({ width: 320, height: 812 })
  const pageWidth = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)
  const historyBounds = await history.boundingBox()
  const methodBounds = await methodSummary.boundingBox()
  expect(historyBounds).not.toBeNull()
  expect(methodBounds).not.toBeNull()
  expect(methodBounds!.y).toBeGreaterThan(historyBounds!.y + historyBounds!.height)

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const transitionDuration = await page
    .getByRole('button', { name: 'Statistiques', exact: true })
    .evaluate((element) => {
      return Number.parseFloat(getComputedStyle(element).transitionDuration)
    })
  expect(transitionDuration).toBeLessThan(0.001)
  const calendarButton = page.getByRole('button', { name: 'Statistiques', exact: true })
  await calendarButton.scrollIntoViewIfNeeded()
  const calendarButtonBox = await calendarButton.boundingBox()
  expect(calendarButtonBox).not.toBeNull()
  await page.mouse.move(
    calendarButtonBox!.x + calendarButtonBox!.width / 2,
    calendarButtonBox!.y + calendarButtonBox!.height / 2,
  )
  await page.mouse.down()
  const activeTransform = await calendarButton.evaluate((element) => getComputedStyle(element).transform)
  expect(activeTransform).toBe('none')
  await page.mouse.up()
})

test('garde un historique long utilisable sans débordement sur iPhone étroit', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-06-30T12:00:00.000Z') })
  await page.goto('/')

  const starts = Array.from({ length: 41 }, (_, index) => {
    const daysBeforeToday = (40 - index) * 28
    return new Date(Date.UTC(2025, 5, 30 - daysBeforeToday)).toISOString().slice(0, 10)
  })
  await importStartDates(page, starts)

  await page.setViewportSize({ width: 320, height: 812 })
  const intervals = page.getByRole('list', { name: 'Intervalles entre les débuts enregistrés' })
  await expect(intervals.getByRole('listitem')).toHaveCount(40)
  await expect(page.getByText('40 intervalles observés')).toBeVisible()
  await expect(page.getByText('Tous les intervalles observés durent 28 jours.')).toBeVisible()

  const pageWidth = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)
})

test('distingue un début enregistré qui devient une date à venir', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-07-01T12:00:00.000Z') })
  await page.goto('/')
  await recordStart(page, '2025-07-01')

  await page.clock.setFixedTime(new Date('2025-06-30T12:00:00.000Z'))
  await page.reload()

  const futureStarts = page.getByRole('list', { name: 'Dates enregistrées à venir' })
  await expect(futureStarts.getByText('1 juillet 2025')).toHaveAttribute('datetime', '2025-07-01')
  await expect(futureStarts.getByText(/ne contribue pas aux intervalles passés/i)).toBeVisible()
  await expect(page.getByText(/enregistre deux débuts passés/i)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Intervalles entre les débuts enregistrés' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Prochain début estimé' })).toHaveCount(0)

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})
