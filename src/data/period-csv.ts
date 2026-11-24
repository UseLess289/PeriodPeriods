import { copyValidatedNewPeriod } from '../domain/periods'
import type { NewPeriod } from '../domain/periods'

const COLUMNS = ['startDate', 'endDate', 'flow', 'symptoms', 'note'] as const

export class InvalidPeriodCsvError extends Error {
  readonly name = 'InvalidPeriodCsvError'
  readonly line: number | null

  constructor(message: string, line: number | null = null) {
    super(line === null ? message : `CSV line ${line}: ${message}`)
    this.line = line
  }
}

type CsvRecord = { readonly line: number; readonly cells: readonly string[] }

function* readCsvRecords(csv: string): Generator<CsvRecord> {
  let cells: string[] = []
  let field = ''
  let state: 'start' | 'plain' | 'quoted' | 'closed' = 'start'
  let line = 1
  let recordLine = line

  for (let i = csv.startsWith('\uFEFF') ? 1 : 0; i < csv.length; i++) {
    const char = csv[i]
    const isNewline = char === '\n' || char === '\r'
    const isCrLf = char === '\r' && csv[i + 1] === '\n'
    if (isNewline) line++

    if (state === 'quoted') {
      if (char === '"') {
        if (csv[i + 1] === '"') {
          field += '"'
          i++
        } else {
          state = 'closed'
        }
      } else {
        field += isCrLf ? '\r\n' : char
        if (isCrLf) i++
      }
    } else if (char === ',' || isNewline) {
      const blankLine = cells.length === 0 && state === 'start'
      cells.push(field)
      if (isNewline) {
        if (!blankLine) yield { line: recordLine, cells }
        cells = []
        recordLine = line
        if (isCrLf) i++
      }
      field = ''
      state = 'start'
    } else if (char === '"' && state === 'start') {
      state = 'quoted'
    } else if (char === '"' || state === 'closed') {
      throw new InvalidPeriodCsvError('Invalid quoting.', recordLine)
    } else {
      field += char
      state = 'plain'
    }
  }

  if (state === 'quoted') throw new InvalidPeriodCsvError('Unclosed quoted field.', recordLine)
  if (cells.length > 0 || state !== 'start') yield { line: recordLine, cells: [...cells, field] }
}

/** Parses the PeriodPeriods CSV import format (not a native Flo export). */
export function parsePeriodCsv(csv: string): NewPeriod[] {
  let header: readonly string[] | undefined
  const periods: NewPeriod[] = []
  const startLines = new Map<string, number>()

  for (const { line, cells } of readCsvRecords(csv)) {
    if (header === undefined) {
      const knownColumns: readonly string[] = COLUMNS
      if (
        !cells.includes('startDate') ||
        new Set(cells).size !== cells.length ||
        cells.some((column) => !knownColumns.includes(column))
      ) {
        throw new InvalidPeriodCsvError(
          `Expected startDate and optional columns: ${COLUMNS.slice(1).join(', ')}.`,
          line,
        )
      }
      header = cells
      continue
    }

    if (cells.length !== header.length) {
      throw new InvalidPeriodCsvError('Column count does not match the header.', line)
    }

    const [startDate, endDate, flow, symptomList, note] = COLUMNS.map((column) => cells[header.indexOf(column)])
    const symptoms = symptomList ? symptomList.split('|').map((symptom) => symptom.trim()) : undefined
    if (symptoms?.includes('')) throw new InvalidPeriodCsvError('Symptoms must not contain empty entries.', line)

    let period: NewPeriod
    try {
      period = copyValidatedNewPeriod({
        startDate,
        endDate: endDate || undefined,
        flow: flow || undefined,
        symptoms,
        note: note || undefined,
      })
    } catch (error) {
      if (!(error instanceof TypeError || error instanceof RangeError)) throw error
      throw new InvalidPeriodCsvError(error.message, line)
    }

    const firstLine = startLines.get(period.startDate)
    if (firstLine !== undefined) {
      throw new InvalidPeriodCsvError(`Duplicate start date (first seen on line ${firstLine}).`, line)
    }
    startLines.set(period.startDate, line)
    periods.push(period)
  }

  if (periods.length === 0) throw new InvalidPeriodCsvError('The CSV must contain at least one period.')
  return periods
}
