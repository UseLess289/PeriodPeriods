import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { recordStart } from './record-start'

test('enregistre localement un début et le retrouve après rechargement dans le calendrier', async ({ page }) => {
  const externalRequests: string[] = []
  const appOrigin = new URL('http://127.0.0.1:4173').origin
  page.on('request', (request) => {
    const requestUrl = new URL(request.url())
    if (requestUrl.origin !== appOrigin) externalRequests.push(request.url())
  })
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Ajouter un événement' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Enregistrer un début de règles' })).toHaveCount(0)
  const firstUseAccessibility = await new AxeBuilder({ page }).analyze()
  expect(firstUseAccessibility.violations).toEqual([])
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Mois précédent' })).toBeFocused()
  await recordStart(page, '2025-03-12')
  const calendar = page.getByRole('table', { name: 'Calendrier pour mars 2025' })
  await expect(
    calendar.getByRole('button', {
      name: 'Modifier la période du 12 mars 2025 (débutée le 12 mars 2025)',
    }),
  ).toBeVisible()

  await page.reload()
  await expect(
    calendar.getByRole('button', {
      name: 'Modifier la période du 12 mars 2025 (débutée le 12 mars 2025)',
    }),
  ).toBeVisible()
  const pageWidth = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)
  const calendarAccessibility = await new AxeBuilder({ page }).analyze()
  expect(calendarAccessibility.violations).toEqual([])
  expect(externalRequests).toEqual([])
})

test('passe de données insuffisantes à la médiane et sa marge sur le calendrier', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-06-28T12:00:00.000Z') })
  await page.goto('/')

  const starts = ['2025-01-01', '2025-01-29', '2025-02-26']
  for (const start of starts) await recordStart(page, start)
  await expect(page.getByRole('heading', { name: 'Pas encore assez de dates.' })).toBeVisible()

  await recordStart(page, '2025-03-27')
  await expect(page.getByRole('heading', { name: 'Prochain début estimé' })).toBeVisible()
  await expect(page.getByText('24 avril', { exact: true })).toHaveAttribute('datetime', '2025-04-24')
  for (const start of ['2025-04-26', '2025-05-27', '2025-06-28']) await recordStart(page, start)

  await expect(page.getByText('28 juillet', { exact: true })).toHaveAttribute('datetime', '2025-07-28')
  await expect(page.locator('.forecast-estimate')).toContainText('± 2 j')
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  const calendar = page.getByRole('table', { name: 'Calendrier pour juillet 2025' })
  await expect(calendar.getByLabel('Borne basse de la plage estimée le 26 juillet 2025')).toBeVisible()
  await expect(calendar.getByLabel('Date centrale estimée le 28 juillet 2025')).toBeVisible()
  await expect(calendar.getByLabel('Borne haute de la plage estimée le 30 juillet 2025')).toBeVisible()
  const calendarAccessibility = await new AxeBuilder({ page }).analyze()
  expect(calendarAccessibility.violations).toEqual([])
})

test('expose une erreur locale récupérable et accessible si IndexedDB est indisponible', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined })
  })
  await page.goto('/')

  await expect(page.getByRole('alert')).toContainText('Impossible de charger tes dates.')
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  const errorAccessibility = await new AxeBuilder({ page }).analyze()
  expect(errorAccessibility.violations).toEqual([])
})
