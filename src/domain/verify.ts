/**
 * F2 domain verification entrypoint.
 * Run: npx --yes tsx src/domain/verify.ts
 * Not imported by the app — typechecked with the project, executed on demand.
 */
import { runDomainVerification } from './verification'

const report = runDomainVerification()
for (const check of report.checks) {
  const mark = check.pass ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`)
}

if (!report.ok) {
  throw new Error(`Domain verification failed (${report.checks.filter((c) => !c.pass).length} check(s))`)
}

console.log(`\nAll ${report.checks.length} checks passed.`)
