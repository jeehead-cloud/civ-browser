/**
 * F4 catalog verification entrypoint (isolated IndexedDB via fake-indexeddb).
 * Run: npm run verify:catalogs
 */
import 'fake-indexeddb/auto'
import { runCatalogVerification } from './verification'

async function main() {
  const report = await runCatalogVerification()
  for (const check of report.checks) {
    const mark = check.pass ? 'PASS' : 'FAIL'
    console.log(`${mark}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`)
  }

  if (!report.ok) {
    throw new Error(
      `Catalog verification failed (${report.checks.filter((c) => !c.pass).length} check(s))`,
    )
  }

  console.log(`\nAll ${report.checks.length} checks passed.`)
}

main().catch((err) => {
  console.error(err)
  throw err
})
