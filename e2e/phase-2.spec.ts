import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00.000Z`),
  )
}

async function selectEntryDate(page: Page, startDate: string) {
  await page.getByRole('button', { name: /Premier jour des règles/ }).click()
  const picker = page.getByRole('table', { name: /Calendrier de saisie pour/ })
  const dateLabel = formatDate(startDate)
  const dateName = new RegExp(`^${dateLabel}(?:, sélectionnée)?$`)
  let attempts = 0
  while ((await picker.getByRole('button', { name: dateName }).count()) === 0 && attempts < 36) {
    await page.getByRole('button', { name: 'Mois précédent' }).click()
    attempts += 1
  }
  await picker.getByRole('button', { name: dateName }).click()
  await page.getByRole('button', { name: `Enregistrer le début du ${dateLabel}` }).click()
}

async function recordStart(page: Page, startDate: string) {
  await selectEntryDate(page, startDate)
  await expect(page.getByRole('status')).toContainText('Date enregistrée sur cet appareil.')
}

test('enregistre localement un début et le retrouve après rechargement dans le calendrier', async ({ page }) => {
  const externalRequests: string[] = []
  const appOrigin = new URL('http://127.0.0.1:4173').origin
  page.on('request', (request) => {
    const requestUrl = new URL(request.url())
    if (requestUrl.origin !== appOrigin) externalRequests.push(request.url())
  })
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')

  const dateTrigger = page.getByRole('button', { name: /Premier jour des règles.*20 mars 2025/ })
  await expect(dateTrigger).toBeVisible()
  const firstUseAccessibility = await new AxeBuilder({ page }).analyze()
  expect(firstUseAccessibility.violations).toEqual([])
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Passer au thème sombre' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dateTrigger).toBeFocused()
  await selectEntryDate(page, '2025-03-12')
  await expect(page.getByRole('status')).toContainText('Date enregistrée sur cet appareil.')
  await expect(page.getByText('12 mars 2025')).toHaveAttribute('datetime', '2025-03-12')

  await page.reload()
  await expect(page.getByText('12 mars 2025')).toHaveAttribute('datetime', '2025-03-12')
  await selectEntryDate(page, '2025-03-12')
  await expect(page.getByRole('button', { name: /Premier jour des règles.*12 mars 2025/ })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByRole('alert')).toContainText('Un début est déjà enregistré pour cette date.')
  const duplicateAccessibility = await new AxeBuilder({ page }).analyze()
  expect(duplicateAccessibility.violations).toEqual([])
  await page.getByRole('button', { name: 'Calendrier', exact: true }).click()
  const calendar = page.getByRole('table', { name: 'Calendrier pour mars 2025' })
  await expect(calendar.getByLabel('Début enregistré le 12 mars 2025')).toBeVisible()
  const pageWidth = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)
  const calendarAccessibility = await new AxeBuilder({ page }).analyze()
  expect(calendarAccessibility.violations).toEqual([])
  expect(externalRequests).toEqual([])
})

test('passe de données insuffisantes à la médiane et sa plage sur le calendrier', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-06-28T12:00:00.000Z') })
  await page.goto('/')

  const starts = ['2025-01-01', '2025-01-29', '2025-02-26']
  for (const start of starts) await recordStart(page, start)
  await expect(page.getByRole('heading', { name: 'Pas encore assez de dates.' })).toBeVisible()

  await recordStart(page, '2025-03-27')
  await expect(page.getByRole('heading', { name: 'Prochain début estimé' })).toBeVisible()
  await expect(page.getByText('24 avril 2025')).toHaveAttribute('datetime', '2025-04-24')
  for (const start of ['2025-04-26', '2025-05-27', '2025-06-28']) await recordStart(page, start)

  await expect(page.getByText('28 juillet 2025')).toHaveAttribute('datetime', '2025-07-28')
  await expect(page.getByText('26 au 30 juillet 2025')).toBeVisible()
  await page.getByRole('button', { name: 'Calendrier', exact: true }).click()
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
