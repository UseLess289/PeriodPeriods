# PeriodPeriods CSV import

This is a PeriodPeriods format, not a native Flo export. Decode the file as UTF-8
before passing its text to the data API. A leading UTF-8 BOM is accepted.

```csv
startDate,endDate,flow,symptoms,note
2025-03-08,2025-03-12,medium,fatigue|cramps,"Felt tired, but better later"
2025-04-05,,,,
```

- Use comma-separated fields, with a case-sensitive header. `startDate` is
  required; `endDate`, `flow`, `symptoms`, and `note` are optional and may appear
  in any order. Unknown or repeated columns are rejected. Each data record must
  have the same number of fields as the header. Leave optional cells empty or
  omit their columns from the header.
- Dates are real calendar dates in `YYYY-MM-DD` format. `endDate` must be on
  or after `startDate`. Flow is `light`, `medium`, or `heavy`. Separate symptoms
  with `|`; surrounding whitespace is trimmed and empty entries are rejected.
  Other fields are not trimmed. Notes are stored as text.
- LF, CRLF, and CR are accepted as line endings. Completely empty lines are
  ignored. Surround fields containing commas, newlines, or quotes with double
  quotes; represent a literal double quote inside a quoted field as `""`.
  The CSV must contain at least one data record. Invalid input, including repeated
  start dates within the file, raises `InvalidPeriodCsvError`, with a one-based
  source line when the error can be attributed to a record.

`parsePeriodCsv(text)` returns validated period fields in file order without
accessing storage. `store.previewPeriodCsv(text)` also reports start dates
already in the database without changing anything. To cancel, do not call
`store.importPeriodCsv(text)`. To confirm, pass the same text: the store validates
it again and checks for conflicts inside the write transaction. Any conflict
rejects the entire batch with `DuplicatePeriodStartError`; existing periods and
settings are never replaced. Successful imports return the new periods in start
date order, with locally generated IDs and timestamps.

PeriodPeriods JSON backup remains a separate version 1 format. Its restore
operation replaces the periods and settings in the database.

## Native Flo evidence

Flo's Help Center lists raw TXT and machine-readable JSON in
[How do I get a copy of my data?](https://help.flo.health/hc/en-us/articles/360054973811-How-do-I-get-a-copy-of-my-data).
[How do I export my data in Anonymous mode?](https://help.flo.health/hc/en-us/articles/8467664174612-How-do-I-export-my-data-in-Anonymous-mode)
also describes the portable JSON file. Neither article identifies the file's
record layout, field names, or date encoding. The independent
[flo-to-drip converter](https://github.com/SaraVieira/flo-to-drip/blob/main/src/formatjson.js)
documents one native layout: `operationalData.cycles[]` contains
`period_start_date` and `period_end_date` ISO date strings (dates or timestamps).
The Flo importer accepts that layout and rejects other layouts rather than
guessing. A preview checks existing start dates before the atomic addition.
The converter is independent of Flo and does not prove that every export
version uses this layout.
