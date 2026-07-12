/**
 * F12 debug editing is development-only by default.
 * Verification may force-enable via setDebugEditingAvailableForTests.
 * Production builds must keep this false (no accidental exposure).
 */
let forceAvailableForTests = false

export function setDebugEditingAvailableForTests(enabled: boolean): void {
  forceAvailableForTests = enabled
}

export function isDebugEditingAvailable(): boolean {
  if (forceAvailableForTests) return true
  try {
    const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } }
    return Boolean(meta.env?.DEV)
  } catch {
    return false
  }
}
