import { assertValidCivilDate, copyValidatedNewPeriod } from '../domain/periods'
import type { NewPeriod } from '../domain/periods'

export class InvalidFloExportError extends Error {
  readonly name = 'InvalidFloExportError'
}

/** Reads the operationalData.cycles layout documented by the flo-to-drip converter. */
export function parseFloExport(json: string): NewPeriod[] {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new InvalidFloExportError('Invalid Flo JSON.')
  }

  if (!data || typeof data !== 'object' || !('operationalData' in data)) {
    throw new InvalidFloExportError('Expected Flo operationalData.')
  }
  const operationalData = data.operationalData
  if (
    !operationalData ||
    typeof operationalData !== 'object' ||
    !('cycles' in operationalData) ||
    !Array.isArray(operationalData.cycles)
  ) {
    throw new InvalidFloExportError('Expected Flo operationalData.cycles.')
  }

  const periods: NewPeriod[] = []
  const starts = new Set<string>()
  for (const cycle of operationalData.cycles) {
    if (cycle && typeof cycle === 'object' && 'period_start_date' in cycle && 'period_end_date' in cycle) {
      const rawStart = cycle.period_start_date
      const rawEnd = cycle.period_end_date
      if (typeof rawStart !== 'string' || typeof rawEnd !== 'string') {
        throw new InvalidFloExportError('Flo cycle dates must be strings.')
      }
      try {
        for (const value of [rawStart, rawEnd]) {
          if (
            !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) ||
            (value.length > 10 && Number.isNaN(Date.parse(value)))
          ) {
            throw new InvalidFloExportError('Flo cycle dates must be ISO dates.')
          }
        }
        const startDate = rawStart.slice(0, 10)
        const endDate = rawEnd.slice(0, 10)
        assertValidCivilDate(startDate)
        assertValidCivilDate(endDate)
        if (starts.has(startDate)) throw new InvalidFloExportError('Duplicate Flo period start.')
        starts.add(startDate)
        periods.push(copyValidatedNewPeriod({ startDate, endDate }))
      } catch {
        throw new InvalidFloExportError('Flo export contains an invalid or duplicate period date.')
      }
    } else {
      throw new InvalidFloExportError('Each Flo cycle needs period_start_date and period_end_date.')
    }
  }
  if (periods.length === 0) throw new InvalidFloExportError('Flo export contains no cycles.')
  return periods.sort((left, right) => left.startDate.localeCompare(right.startDate))
}
