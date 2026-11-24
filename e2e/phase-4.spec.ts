import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import { recordStart } from './record-start'

function validBackup(startDates: string[], firstDayOfWeek: 0 | 1 = 1) {
  return {
    version: 1,
    periods: startDates.map((startDate, index) => ({
      id: `backup-${index + 1}`,
      startDate,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    })),
    settings: { forecastMethod: 'median-6', firstDayOfWeek },
  }
}

async function swipeFrom(page: Page, selector: string, startX: number, endX: number, startY = 320, endY = startY) {
  await page.locator(selector).evaluate(
    (target, { startX, endX, startY, endY }) => {
      const pointerOptions = (clientX: number, clientY: number) => ({
        bubbles: true,
        cancelable: true,
        pointerId: 44,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX,
        clientY,
      })
      target.dispatchEvent(new PointerEvent('pointerdown', pointerOptions(startX, startY)))
      target.dispatchEvent(new PointerEvent('pointermove', pointerOptions(endX, endY)))
      target.dispatchEvent(new PointerEvent('pointerup', pointerOptions(endX, endY)))
    },
    { startX, endX, startY, endY },
  )
}

async function tapWithTouch(page: Page, selector: string) {
  const bounds = await page.locator(selector).boundingBox()
  expect(bounds).not.toBeNull()
  const touch = await page.context().newCDPSession(page)
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2 }],
  })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await touch.detach()
}

test('navigue avec la barre du bas et restaure l’historique', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')

  await swipeFrom(page, 'main', 300, 170)
  await expect(page.getByRole('heading', { name: 'Suivi des règles et du cycle' })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)

  await page.getByRole('button', { name: 'Statistiques', exact: true }).click()
  await expect(page).toHaveURL(/\?view=stats$/)
  await expect(page.getByRole('button', { name: 'Statistiques', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeFocused()
  const headingOutline = await page.getByRole('heading', { name: 'Statistiques' }).evaluate((element) => {
    return getComputedStyle(element).outlineStyle
  })
  expect(headingOutline).toBe('none')

  await page.getByRole('button', { name: 'Réglages' }).click()
  await expect(page).toHaveURL(/\?view=settings$/)
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeFocused()

  await page.goBack()
  await expect(page).toHaveURL(/\?view=stats$/)
  await expect(page.getByRole('button', { name: 'Statistiques', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.goForward()
  await expect(page).toHaveURL(/\?view=settings$/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sauvegarde locale' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réglages' })).toHaveAttribute('aria-current', 'page')

  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeFocused()
  const verticalGesture = await page.evaluate(() => {
    const main = document.querySelector('main')!
    const options = (clientX: number, clientY: number) => ({
      bubbles: true,
      cancelable: true,
      pointerId: 43,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX,
      clientY,
    })
    const move = new PointerEvent('pointermove', options(285, 430))
    main.dispatchEvent(new PointerEvent('pointerdown', options(290, 320)))
    main.dispatchEvent(move)
    main.dispatchEvent(new PointerEvent('pointerup', options(285, 430)))
    return { prevented: move.defaultPrevented, touchAction: getComputedStyle(main).touchAction }
  })
  expect(verticalGesture.prevented).toBe(false)
  expect(verticalGesture.touchAction).not.toBe('none')
  await expect(page.getByRole('button', { name: 'Statistiques', exact: true })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('button', { name: 'Accueil' }).click()
  const scrollStart = await page.evaluate(() => window.scrollY)
  const calendarBounds = await page.getByRole('table', { name: /Calendrier pour/ }).boundingBox()
  expect(calendarBounds).not.toBeNull()
  const touchX = calendarBounds!.x + calendarBounds!.width / 2
  const touchY = calendarBounds!.y + calendarBounds!.height / 2
  const touch = await page.context().newCDPSession(page)
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchX, y: touchY }] })
  for (let step = 1; step <= 5; step += 1) {
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: touchX, y: touchY - step * 30 }],
    })
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollStart)

  await page.getByRole('button', { name: 'Accueil' }).click()
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  await swipeFrom(page, '#event-start', 300, 140)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Suivi des règles et du cycle' })).toBeVisible()
  await expect(page).not.toHaveURL(/\?view=stats$/)
})

test('change le mois par balayage sans changer de section ni sélectionner une date', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Mars 2025' })).toBeVisible()
  const addActionPosition = await page.evaluate(() => {
    const table = document.querySelector('.calendar-table')!
    const legend = document.querySelector('.calendar-legend')!
    const addAction = document.querySelector('.calendar-add-action')!
    return {
      tableBottom: table.getBoundingClientRect().bottom + window.scrollY,
      legendBottom: legend.getBoundingClientRect().bottom + window.scrollY,
      addActionTop: addAction.getBoundingClientRect().top + window.scrollY,
    }
  })
  expect(addActionPosition.addActionTop).toBeGreaterThan(addActionPosition.tableBottom)
  expect(addActionPosition.addActionTop).toBeGreaterThan(addActionPosition.legendBottom)

  await swipeFrom(page, '.calendar-table', 300, 140, 320, 320)
  await expect(page.getByRole('heading', { name: 'Avril 2025' })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)

  await swipeFrom(page, '.calendar-table', 140, 300, 320, 320)
  await expect(page.getByRole('heading', { name: 'Mars 2025' })).toBeVisible()

  await swipeFrom(page, '.calendar-table', 200, 195, 320, 430)
  await expect(page.getByRole('heading', { name: 'Mars 2025' })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter plusieurs débuts' }).click()
  const selectionPanelPosition = await page.evaluate(() => ({
    tableBottom: document.querySelector('.calendar-table')!.getBoundingClientRect().bottom + window.scrollY,
    panelTop: document.querySelector('.calendar-selection-panel')!.getBoundingClientRect().top + window.scrollY,
  }))
  expect(selectionPanelPosition.panelTop).toBeGreaterThan(selectionPanelPosition.tableBottom)

  await tapWithTouch(page, 'button.calendar-date-choice[aria-label="1 mars 2025"]')
  await expect(page.locator('.selection-count')).toHaveText('1 début sélectionné')

  const selectedDate = page.locator('button.calendar-date-choice[aria-label^="1 mars 2025"]')
  await selectedDate.evaluate((element) => {
    element.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 45,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: 300,
        clientY: 320,
      }),
    )
  })
  await page.clock.runFor(100)
  await selectedDate.evaluate((element) => {
    const pointerOptions = {
      bubbles: true,
      cancelable: true,
      pointerId: 45,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientY: 320,
    }
    element.dispatchEvent(new PointerEvent('pointermove', { ...pointerOptions, clientX: 285 }))
    element.dispatchEvent(new PointerEvent('pointerup', { ...pointerOptions, clientX: 285 }))
    element.click()
  })
  await expect(page.locator('.selection-count')).toHaveText('1 début sélectionné')

  await swipeFrom(page, 'button.calendar-date-choice[aria-label="2 mars 2025"]', 300, 140, 320, 320)
  await expect(page.getByRole('heading', { name: 'Avril 2025' })).toBeVisible()
  await expect(page.locator('.selection-count')).toHaveText('1 début sélectionné')
})

test('le bouton Ajouter ouvre la saisie, qui accepte une date passée et gère le clavier', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')

  const add = page.getByRole('button', { name: 'Ajouter un événement' })
  await add.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Enregistrer une période' })
  const start = dialog.getByLabel('Début des règles')
  await expect(start).toBeFocused()
  await expect(start).toHaveValue('2025-03-20')
  await start.fill('2025-03-21')
  expect(await start.evaluate((input: HTMLInputElement) => input.validity.rangeOverflow)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(add).toBeFocused()

  await recordStart(page, '2025-03-12')
  await expect(page.getByLabel('Début enregistré le 12 mars 2025')).toBeVisible()
})

test('sélectionne plusieurs débuts distincts, bloque les doublons et les dates futures', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')
  await recordStart(page, '2025-03-12')
  await page.getByRole('button', { name: 'Ajouter plusieurs débuts' }).click()

  const calendar = page.getByRole('table', { name: 'Calendrier pour mars 2025' })
  await expect(calendar.getByRole('button', { name: '1 mars 2025', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(calendar.getByRole('button', { name: '2 mars 2025', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(calendar.getByRole('button', { name: '1 mars 2025', exact: true })).toBeFocused()
  await swipeFrom(page, 'button.calendar-date-choice[aria-label="1 mars 2025"]', 300, 100)
  await expect(page.getByRole('heading', { name: 'Avril 2025' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accueil', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Ajouter plusieurs débuts' })).toBeVisible()
  await expect(page.locator('.selection-count')).toHaveText('0 débuts sélectionnés')
  await page.getByRole('button', { name: 'Mois précédent' }).click()
  await expect(page.getByRole('heading', { name: 'Mars 2025' })).toBeVisible()
  await expect(calendar.getByRole('button', { name: /12 mars 2025, début déjà enregistré/ })).toBeDisabled()
  await expect(calendar.getByRole('button', { name: '21 mars 2025, date future, non sélectionnable' })).toBeDisabled()
  await expect(page.getByText(/aucune plage continue/i)).toBeVisible()
  await calendar.getByRole('button', { name: '13 mars 2025' }).click()
  await calendar.getByRole('button', { name: '16 mars 2025' }).click()
  await expect(page.getByRole('button', { name: 'Enregistrer 2 débuts' })).toBeEnabled()
  const selectionAccessibility = await new AxeBuilder({ page }).analyze()
  expect(selectionAccessibility.violations).toEqual([])
  await page.getByRole('button', { name: 'Enregistrer 2 débuts' }).click()

  await expect(page.locator('.calendar-section [role="status"]')).toContainText(
    '2 débuts enregistrés sur cet appareil.',
  )
  await expect(calendar.getByLabel('Début enregistré le 13 mars 2025')).toBeVisible()
  await expect(calendar.getByLabel('Début enregistré le 16 mars 2025')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ajouter plusieurs débuts' })).toBeFocused()
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(page.getByRole('heading', { name: 'Pas encore assez de dates.' })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter plusieurs débuts' }).click()
  const refreshedCalendar = page.getByRole('table', { name: 'Calendrier pour mars 2025' })
  await expect(refreshedCalendar.getByRole('button', { name: /13 mars 2025, début déjà enregistré/ })).toBeDisabled()
  await expect(refreshedCalendar.getByRole('button', { name: /16 mars 2025, début déjà enregistré/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Enregistrer 0 débuts' })).toBeDisabled()
  await page.getByRole('button', { name: 'Annuler' }).click()
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})

test('exporte un fichier v1 et l’import valide remplace les dates et réglages après confirmation', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-27T12:00:00.000Z') })
  await page.goto('/')
  await recordStart(page, '2025-03-27')

  await page.getByRole('button', { name: 'Réglages' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger la sauvegarde' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^periodperiods-backup-.*\.json$/)
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()
  const exported = JSON.parse(await readFile(downloadPath!, 'utf8'))
  expect(exported.version).toBe(1)
  expect(exported.periods).toHaveLength(1)
  expect(exported.periods[0].startDate).toBe('2025-03-27')
  await expect(page.locator('#backup-export-status')).toContainText(/données personnelles et les réglages/i)

  const replacement = validBackup(['2025-01-01', '2025-01-29', '2025-02-26', '2025-03-27'], 0)
  await page.locator('#period-backup-file').setInputFiles({
    name: 'remplacement.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(replacement)),
  })
  await expect(page.getByRole('heading', { name: 'Aperçu de la sauvegarde' })).toBeVisible()
  await expect(page.locator('.backup-preview')).toContainText('JSON v1')
  await expect(page.locator('.backup-preview')).toContainText('1 janvier 2025 au 27 mars 2025')
  await expect(page.getByText(/remplacera les dates et réglages actuellement enregistrés/i)).toBeVisible()
  const importPreviewAccessibility = await new AxeBuilder({ page }).analyze()
  expect(importPreviewAccessibility.violations).toEqual([])
  await page.getByRole('button', { name: 'Remplacer les données actuelles' }).click()
  await expect(page.locator('#backup-import-status')).toContainText('Sauvegarde importée.')
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(page.getByLabel('Début enregistré le 27 mars 2025')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Prochain début estimé' })).toBeVisible()
  await expect(page.getByText('24 avril', { exact: true })).toHaveAttribute('datetime', '2025-04-24')

  const calendar = page.getByRole('table', { name: 'Calendrier pour mars 2025' })
  await expect(calendar.getByRole('columnheader').first()).toHaveAccessibleName('dimanche')
})

test('un fichier invalide ou un import annulé ne modifie pas les données actuelles', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')
  await recordStart(page, '2025-03-12')
  await page.getByRole('button', { name: 'Réglages' }).click()

  await page.locator('#period-backup-file').setInputFiles({
    name: 'invalide.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ ceci n’est pas du JSON'),
  })
  await expect(page.getByRole('alert')).toContainText('Ce fichier ne correspond pas à une sauvegarde JSON v1 valide.')
  await expect(page.getByRole('button', { name: 'Remplacer les données actuelles' })).toHaveCount(0)
  const invalidBackupAccessibility = await new AxeBuilder({ page }).analyze()
  expect(invalidBackupAccessibility.violations).toEqual([])
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(page.getByLabel('Début enregistré le 12 mars 2025')).toBeVisible()

  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.locator('#period-backup-file').setInputFiles({
    name: 'annulation.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(validBackup(['2025-02-05']))),
  })
  await expect(page.getByRole('heading', { name: 'Aperçu de la sauvegarde' })).toBeVisible()
  await page.getByRole('button', { name: 'Annuler l’import' }).click()
  await expect(page.locator('#backup-import-status')).toContainText('Import annulé.')
  await page.getByRole('button', { name: 'Accueil' }).click()
  await expect(page.getByLabel('Début enregistré le 12 mars 2025')).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})

test('reste dans la largeur aux tailles cibles et conserve thèmes, contraste et mouvement réduits', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector('main')!.scrollWidth,
    }))
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
    expect(dimensions.main).toBeLessThanOrEqual(dimensions.viewport)

    await page.getByRole('button', { name: 'Ajouter un événement' }).click()
    const dialogBounds = await page.getByRole('dialog').boundingBox()
    expect(dialogBounds).not.toBeNull()
    expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(width + 1)
    await page.getByRole('button', { name: 'Annuler' }).click()
    const calendarWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(calendarWidth).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: 'Réglages' }).click()
    const settingsWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(settingsWidth).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: 'Accueil' }).click()
  }

  await page.emulateMedia({ colorScheme: 'dark', contrast: 'more', reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByRole('button', { name: 'Passer au thème sombre' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const darkAccessibility = await new AxeBuilder({ page }).analyze()
  expect(darkAccessibility.violations).toEqual([])
  await page.getByRole('button', { name: 'Accueil' }).click()

  const reducedMotionDuration = await page
    .getByRole('button', { name: 'Statistiques', exact: true })
    .evaluate((element) => {
      return Number.parseFloat(getComputedStyle(element).transitionDuration)
    })
  expect(reducedMotionDuration).toBeLessThan(0.001)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  })
  const navigationMaterial = await page.locator('.bottom-nav').evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    backdropFilter: getComputedStyle(element).backdropFilter,
  }))
  expect(navigationMaterial.backdropFilter).toBe('none')
  expect(navigationMaterial.background).not.toContain('0.96')
})
