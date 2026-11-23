import type { CivilDate } from '../../domain/periods'

export function formatCivilDate(date: CivilDate): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}
