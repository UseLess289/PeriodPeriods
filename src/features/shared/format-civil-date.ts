import type { CivilDate } from '../../domain/periods'

export type Locale = 'fr' | 'en'

const intlLocales = { fr: 'fr-FR', en: 'en-US' } as const

function civilDateFormatter(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(intlLocales[locale], { ...options, timeZone: 'UTC' })
}

const longDates = {
  fr: civilDateFormatter('fr', { dateStyle: 'long' }),
  en: civilDateFormatter('en', { dateStyle: 'long' }),
}

const monthDayDates = {
  fr: civilDateFormatter('fr', { month: 'long', day: 'numeric' }),
  en: civilDateFormatter('en', { month: 'long', day: 'numeric' }),
}

export function formatCivilDate(date: CivilDate, locale: Locale = 'fr'): string {
  return longDates[locale].format(new Date(`${date}T00:00:00.000Z`))
}

export function formatCivilMonthDay(date: CivilDate, locale: Locale): string {
  return monthDayDates[locale].format(new Date(`${date}T00:00:00.000Z`))
}

export function formatCivilMonth(monthStart: CivilDate, locale: Locale): string {
  return civilDateFormatter(locale, { month: 'long', year: 'numeric' }).format(new Date(`${monthStart}T00:00:00.000Z`))
}

export function getCalendarWeekdays(firstDayOfWeek: 0 | 1, locale: Locale) {
  const long = civilDateFormatter(locale, { weekday: 'long' })
  const short = civilDateFormatter(locale, { weekday: 'short' })
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = (firstDayOfWeek + index) % 7
    const date = new Date(Date.UTC(2023, 0, 1 + weekday))
    return { longName: long.format(date), shortName: short.format(date) }
  })
}
