import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const vitestCli = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
const timeZones = ['UTC', 'America/New_York', 'Pacific/Apia']
const civilDateTests = [
  'src/domain/periods/index.test.ts',
  'src/domain/dates/index.test.ts',
  'src/domain/forecast/estimate-cycle-phases.test.ts',
  'src/domain/forecast/estimate-next-period.test.ts',
  'src/domain/history/get-cycle-history.test.ts',
]

for (const timeZone of timeZones) {
  process.stdout.write(`\nCivil-date and calendar tests with TZ=${timeZone}\n`)
  const result = spawnSync(process.execPath, [vitestCli, 'run', ...civilDateTests], {
    cwd: projectRoot,
    env: { ...process.env, TZ: timeZone },
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
