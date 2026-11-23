import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('présente l’historique complet et explique la médiane sur un petit écran', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-06-30T12:00:00.000Z') })
  await page.goto('/')

  const dateInput = page.getByLabel('Premier jour des règles')
  for (const startDate of [
    '2025-01-01',
    '2025-01-29',
    '2025-02-26',
    '2025-03-27',
    '2025-04-25',
    '2025-05-24',
    '2025-06-22',
    '2025-06-30',
  ]) {
    await dateInput.fill(startDate)
    await page.getByRole('button', { name: 'Enregistrer le début' }).click()
    await expect(page.getByRole('status')).toContainText('Date enregistrée sur cet appareil.')
  }

  const history = page.getByRole('list', { name: 'Intervalles entre les débuts enregistrés' })
  await expect(history.getByRole('listitem')).toHaveCount(7)
  await expect(page.getByText('7 intervalles observés')).toBeVisible()
  await expect(page.getByText(/de 8 à 29 jours/i)).toBeVisible()
  await expect(page.getByText('29 juillet 2025', { exact: true })).toHaveAttribute('datetime', '2025-07-29')

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
  const latestHeading = await page.getByRole('heading', { name: 'Dernier début enregistré' }).boundingBox()
  const latestDate = await page.locator('.latest-period-date').boundingBox()
  expect(latestHeading).not.toBeNull()
  expect(latestDate).not.toBeNull()
  expect(latestDate!.y - latestHeading!.y).toBeLessThan(100)

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const transitionDuration = await page.getByRole('button', { name: 'Calendrier', exact: true }).evaluate((element) => {
    return Number.parseFloat(getComputedStyle(element).transitionDuration)
  })
  expect(transitionDuration).toBeLessThan(0.001)
  const calendarButton = page.getByRole('button', { name: 'Calendrier', exact: true })
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

  const dateInput = page.getByLabel('Premier jour des règles')
  const starts = Array.from({ length: 41 }, (_, index) => {
    const daysBeforeToday = (40 - index) * 28
    return new Date(Date.UTC(2025, 5, 30 - daysBeforeToday)).toISOString().slice(0, 10)
  })
  for (const startDate of starts) {
    await dateInput.fill(startDate)
    await page.getByRole('button', { name: 'Enregistrer le début' }).click()
    await expect(page.getByRole('status')).toContainText('Date enregistrée sur cet appareil.')
  }

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
  await page.getByLabel('Premier jour des règles').fill('2025-07-01')
  await page.getByRole('button', { name: 'Enregistrer le début' }).click()
  await expect(page.getByRole('status')).toContainText('Date enregistrée sur cet appareil.')

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
