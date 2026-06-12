import * as fs from 'fs'
import * as path from 'path'
import type { APIRequestContext } from '@playwright/test'

const TOKEN_PATH = path.resolve(process.cwd(), '.auth', 'token')

export function getCachedToken(): string | undefined {
  try {
    if (!fs.existsSync(TOKEN_PATH)) return undefined
    const token = fs.readFileSync(TOKEN_PATH, 'utf-8').trim()
    return isTokenExpired(token) ? undefined : token
  } catch {
    return undefined
  }
}

export function cacheToken(token: string): void {
  const dir = path.dirname(TOKEN_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(TOKEN_PATH, token, 'utf-8')
}

/**
 * Detect expiry of a JWT by decoding its payload. For non-JWT (opaque) tokens
 * we can't introspect — assume valid and let the API return 401 if it isn't.
 * For tokens that LOOK like JWTs but fail to parse, treat as expired (safer).
 */
// Refresh a little BEFORE the real expiry so a cached token never dies mid-request.
const EXPIRY_BUFFER_MS = 60_000

export function isTokenExpired(token: string): boolean {
  // Opaque token (no dots) — we can't know. Trust it; API will reject if stale.
  if (!token.includes('.')) return false
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    if (typeof payload.exp !== 'number') return false
    // "Expires within the buffer" counts as expired, so the caller logs in fresh.
    return payload.exp * 1000 < Date.now() + EXPIRY_BUFFER_MS
  } catch {
    // Looks like a JWT but parse failed → treat as expired so caller refreshes
    return true
  }
}

/**
 * Log in via POST /auth/login and return the access token (expected at
 * `data.accessToken` in the envelope — ADAPT path + field to your API). The exemplar
 * mock has no auth endpoints; this helper is kept for real-API adaptations.
 */
export async function loginWithCredentials(
  request: APIRequestContext,
  baseUrl: string,
  username: string,
  password: string,
  loginPath = 'auth/login',
): Promise<string | undefined> {
  try {
    // Build an absolute URL to bypass Playwright's relative-URL resolution
    // (which would drop the trailing path segment of baseUrl).
    const url = `${baseUrl.replace(/\/$/, '')}/${loginPath.replace(/^\//, '')}`
    const res = await request.post(url, {
      headers: { 'Content-Type': 'application/json' },
      data: { username, password },
    })
    if (!res.ok()) return undefined
    const json = await res.json()
    return json.data?.accessToken ?? undefined
  } catch {
    return undefined
  }
}
