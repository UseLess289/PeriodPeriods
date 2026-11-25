import { expect, type Page } from '@playwright/test'

export async function recordStart(page: Page, date: string) {
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Début des règles').fill(date)
  const next = dialog.getByRole('button', { name: 'Suivant', exact: true })
  if (await next.isVisible()) {
    await next.click()
    await dialog.getByRole('button', { name: 'Valider', exact: true }).click()
  } else {
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  }
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Période enregistrée sur cet appareil.')).toBeVisible()
}
