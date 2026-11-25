import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'

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
  const firstFollicularDay = calendar.locator('time[datetime="2026-11-21"]').locator('xpath=..')
  await expect(firstFollicularDay).toHaveAttribute('style', /var\(--phase-menstrual\).*var\(--phase-follicular\)/)

  const finalFollicularDay = calendar.locator('time[datetime="2026-11-29"]').locator('xpath=..')
  const firstOvulatoryDay = calendar.locator('time[datetime="2026-11-30"]').locator('xpath=..')
  await expect(finalFollicularDay).toHaveAttribute('style', /var\(--phase-follicular\).*var\(--phase-ovulatory\)/)
  await expect(firstOvulatoryDay).toHaveAttribute('style', /var\(--phase-follicular\).*var\(--phase-ovulatory\)/)
})
