import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { recordStart } from './record-start'

test('blends phase boundaries after importing the estimations fixture', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-25T12:00:00.000Z') })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.locator('#period-backup-file').setInputFiles(resolve(process.cwd(), 'test/estimations.json'))
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.locator('#backup-import-status')).toContainText('Sauvegarde importée.')
  await page.getByRole('button', { name: 'Accueil' }).click()

  const calendar = page.getByRole('table', { name: 'Calendrier pour novembre 2026' })
  await expect(calendar.locator('td[style*="linear-gradient"]')).not.toHaveCount(0)
  const lastDurationGuideDay = calendar.getByRole('button', { name: /Modifier la période du 20 novembre 2026/ })
  await expect(lastDurationGuideDay).toHaveAccessibleDescription(/durée indicative, sans observation/)
  await expect(lastDurationGuideDay.locator('xpath=..')).toHaveClass(/has-duration-guide/)
  const firstFollicularDay = calendar.locator('time[datetime="2026-11-21"]').locator('xpath=..')
  await expect(firstFollicularDay).toHaveAttribute('style', /var\(--phase-follicular\)/)
  await expect(firstFollicularDay).not.toHaveAttribute('style', /--phase-menstrual/)

  const finalFollicularDay = calendar.locator('time[datetime="2026-11-29"]').locator('xpath=..')
  const firstOvulatoryDay = calendar.locator('time[datetime="2026-11-30"]').locator('xpath=..')
  await expect(finalFollicularDay).toHaveAttribute('style', /var\(--phase-follicular\).*var\(--phase-ovulatory\)/)
  await expect(firstOvulatoryDay).toHaveAttribute('style', /var\(--phase-follicular\).*var\(--phase-ovulatory\)/)
})

test('keeps a recorded start pink and still colors a forecast that coincides with a future recorded start', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-25T12:00:00.000Z') })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.locator('#period-backup-file').setInputFiles(resolve(process.cwd(), 'test/stats-demo-backup.json'))
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.locator('#backup-import-status')).toContainText('Sauvegarde importée.')
  await page.getByRole('button', { name: 'Accueil' }).click()

  const november = page.getByRole('table', { name: 'Calendrier pour novembre 2026' })
  const recordedStart = november.locator('time[datetime="2026-11-25"]').locator('xpath=../..')
  await expect(recordedStart).toHaveClass(/has-period-day/)
  await expect(recordedStart).not.toHaveClass(/has-estimated-period-day/)

  await page.getByRole('button', { name: 'Mois suivant' }).click()
  const december = page.getByRole('table', { name: 'Calendrier pour décembre 2026' })
  const predictedAndRecordedStart = december.locator('time[datetime="2026-12-25"]').locator('xpath=../..')
  await expect(predictedAndRecordedStart).toHaveClass(/is-future-start/)
  await expect(predictedAndRecordedStart).toHaveClass(/is-estimated-center/)
  await expect(predictedAndRecordedStart).toHaveClass(/has-estimated-period-day/)
  await expect(predictedAndRecordedStart).toHaveClass(/phase-expected-menstrual/)
  await expect(predictedAndRecordedStart).toHaveAttribute('style', /var\(--phase-menstrual\)/)
})

test('shows all default-duration days as a light menstrual guide without calling them observations', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-25T12:00:00.000Z') })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.locator('#period-backup-file').setInputFiles(resolve(process.cwd(), 'test/estimations.json'))
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.locator('#backup-import-status')).toContainText('Sauvegarde importée.')
  await page.getByRole('button', { name: 'Accueil' }).click()

  await recordStart(page, '2026-11-25')
  const calendar = page.getByRole('table', { name: 'Calendrier pour novembre 2026' })
  const startCell = calendar.locator('td:has(time[datetime="2026-11-25"])')
  const firstGuideCell = calendar.locator('td:has(time[datetime="2026-11-26"])')

  await expect(startCell).toHaveClass(/has-period-day/)
  await expect(firstGuideCell).toHaveClass(/has-duration-guide/)
  await expect(firstGuideCell.getByRole('button')).toHaveAccessibleDescription(/durée indicative, sans observation/)
  const [startColor, guideColor] = await Promise.all([
    startCell.evaluate((element) => getComputedStyle(element).backgroundColor),
    firstGuideCell.evaluate((element) => getComputedStyle(element).backgroundColor),
  ])
  expect(guideColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(guideColor).not.toBe(startColor)

  for (const date of ['2026-11-27', '2026-11-28', '2026-11-29']) {
    await expect(calendar.locator(`td:has(time[datetime="${date}"])`)).toHaveClass(/has-duration-guide/)
  }
})
