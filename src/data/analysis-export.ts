import { daysBetweenCivilDates, getPeriodDuration, pickDailyIntensities, type Period } from '../domain/periods'

export function serializeAnalysisExport(periods: readonly Period[], today: string): string {
  const observed = periods
    .filter(({ startDate }) => startDate <= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const firstStart = observed[0]?.startDate
  return JSON.stringify(
    {
      version: 1,
      periods: firstStart
        ? observed.map((period) => ({
            startDay: daysBetweenCivilDates(firstStart, period.startDate),
            durationDays: getPeriodDuration(period),
            dailyLogs: (period.dailyLogs ?? [])
              .filter(({ day }) => day <= daysBetweenCivilDates(period.startDate, today) + 1)
              .map((entry) => ({
                day: entry.day,
                flow: entry.flow,
                headache: entry.headache,
                ...pickDailyIntensities(entry),
              }))
              .filter(
                (entry) =>
                  entry.flow !== undefined ||
                  entry.headache !== undefined ||
                  Object.keys(pickDailyIntensities(entry)).length > 0,
              ),
          }))
        : [],
    },
    null,
    2,
  )
}
