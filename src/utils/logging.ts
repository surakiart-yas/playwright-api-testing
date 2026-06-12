const SENSITIVE_FIELD =
  /password|secret|token|apikey|api[-_]?key|authorization|cookie|set-cookie|x-api-key|x-auth/i

/**
 * Whether to mask secret-looking fields in logs + report attachments. Masked in CI because the
 * Allure report is uploaded / shared (see docs/cicd-pipeline.md), but shown LOCALLY so a
 * developer can debug the exact value sent — e.g. the 128-char password in TC-065, or a token's
 * scope. Force either way with `MASK_SECRETS=true|false`.
 */
function maskingEnabled(): boolean {
  const flag = process.env.MASK_SECRETS
  if (flag === 'true') return true
  if (flag === 'false') return false
  return Boolean(process.env.CI) // default: mask in CI, reveal locally
}

export function maskSensitive(value: unknown): unknown {
  if (!maskingEnabled()) return value
  if (value == null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(maskSensitive)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_FIELD.test(k) ? '***' : maskSensitive(v)
  }
  return out
}

function indent(s: string, prefix = '    '): string {
  return s
    .split('\n')
    .map((line) => prefix + line)
    .join('\n')
}

function formatJson(value: unknown): string {
  return indent(JSON.stringify(maskSensitive(value), null, 2))
}

export function logApiCall(
  label: string,
  method: string,
  url: string,
  responseMs: number,
  status: number,
  requestHeaders: Record<string, string> | undefined,
  requestBody: unknown,
  responseBody: unknown,
  testTitle?: string,
): void {
  if (process.env.DEBUG_API !== 'true') return
  // Suffix test title to the operation label so parallel-worker logs stay
  // greppable: `grep "should publish"` finds every API call from that test.
  const header = testTitle ? `[API] ${label} · ${testTitle}` : `[API] ${label}`
  console.log(`\n${header}`)
  console.log(`  ${method} ${url}  →  ${status}  (${responseMs}ms)`)
  if (requestHeaders && Object.keys(requestHeaders).length > 0) {
    console.log('  REQ HEADERS:')
    console.log(formatJson(requestHeaders))
  }
  if (requestBody !== undefined && requestBody !== null) {
    console.log('  REQ BODY:')
    console.log(formatJson(requestBody))
  }
  if (responseBody !== undefined && responseBody !== null) {
    console.log('  RES BODY:')
    console.log(formatJson(responseBody))
  }
}

export function logDebug(label: string, message: string): void {
  if (process.env.DEBUG_API !== 'true') return
  console.log(`[DEBUG] ${label}: ${message}`)
}
