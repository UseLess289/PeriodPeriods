import { expect, test } from '@playwright/test'

test('transitions between sections without blocking navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Suivi des règles et du cycle' })).toBeVisible()
  await expect(page.locator('.view-content')).not.toHaveClass(/view-content-enter/)

  await page.getByRole('button', { name: 'Statistiques' }).click()
  await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeVisible()
  await expect(page.locator('.view-content')).toHaveClass(/view-content-enter/)

  const viewAnimationDuration = await page
    .locator('.view-content')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration))
  expect(viewAnimationDuration).toBeGreaterThan(0.08)
  expect(viewAnimationDuration).toBeLessThan(0.25)

  await page.getByRole('button', { name: 'Réglages' }).click()
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réglages' })).toHaveAttribute('aria-current', 'page')
})

test('follows a calendar swipe and animates the next month', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-03-20T12:00:00.000Z') })
  await page.goto('/')

  const calendar = page.getByRole('table', { name: 'Calendrier pour mars 2025' })
  await expect(calendar).toBeVisible()
  await calendar.evaluate((table) => {
    const options = (clientX: number) => ({
      bubbles: true,
      cancelable: true,
      pointerId: 24,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX,
      clientY: 320,
    })
    table.dispatchEvent(new PointerEvent('pointerdown', options(300)))
    table.dispatchEvent(new PointerEvent('pointermove', options(220)))
  })

  expect(await calendar.evaluate((table) => getComputedStyle(table).transform)).not.toBe('none')

  await calendar.evaluate((table) => {
    table.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 24,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: 220,
        clientY: 320,
      }),
    )
  })

  await expect(page.getByRole('heading', { name: 'Avril 2025' })).toBeVisible()
  const monthViewport = page.locator('.calendar-month-viewport')
  await expect(monthViewport).toHaveClass(/is-entering-next/)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  await expect(page.getByRole('heading', { name: 'Mai 2025' })).toBeVisible()
  const reducedMotionDuration = await page
    .locator('.calendar-month-viewport')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration))
  expect(reducedMotionDuration).toBeLessThan(0.001)
})
