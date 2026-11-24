import { expect, type Page } from '@playwright/test'

export async function recordStart(page: Page, date: string) {
  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Début des règles').fill(date)
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Période enregistrée sur cet appareil.')).toBeVisible()
}
