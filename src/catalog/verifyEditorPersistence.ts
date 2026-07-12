/**
 * F5 editor persistence verification entrypoint.
 * Run: npm run verify:editor-persistence
 */
import { runEditorPersistenceVerification } from './editorPersistenceVerification'

async function main() {
  const report = await runEditorPersistenceVerification()
  for (const check of report.checks) {
    const mark = check.pass ? 'PASS' : 'FAIL'
    console.log(`${mark}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`)
  }

  if (!report.ok) {
    throw new Error(
      `Editor persistence verification failed (${report.checks.filter((c) => !c.pass).length} check(s))`,
    )
  }

  console.log(`\nAll ${report.checks.length} checks passed.`)
}

main().catch((err) => {
  console.error(err)
  throw err
})
