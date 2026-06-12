import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Minimal HS256 JWT helpers for TESTS only — no runtime dependency (Node `crypto`).
 *
 * Purpose: forge a correctly-signed token with a chosen payload (e.g. a `scope` the API never
 * issues) so we can exercise authorization paths the API won't reach on its own — the canonical
 * case is a 403 insufficient-token-scope test. A forged-but-UNSIGNED token fails the
 * signature check first, so to reach the scope check the token must be validly signed,
 * which needs the backend's signing secret.
 *
 * Secrets (symmetric → HS256) are supplied by the backend team via env, gitignored:
 *   - JWT_ACCESS_SECRET   — signs access tokens
 *   - JWT_REFRESH_SECRET  — signs refresh tokens
 *
 * ASSUMPTIONS to confirm with the backend before relying on this:
 *   1. algorithm is HS256 (a symmetric secret, not an RS256 key pair),
 *   2. the exact claim set a real token carries (decode a real one with `decodeJwt`),
 *   3. that a valid token with an unexpected `scope` actually returns the documented 403.
 */

const b64url = (input: Buffer | string): string => Buffer.from(input).toString('base64url')

export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

/**
 * Decode a JWT WITHOUT verifying the signature — inspect header + claims. No secret needed.
 * Use it to read a real token's structure so a forged one can replicate the required claims.
 */
export function decodeJwt(token: string): DecodedJwt {
  const [h, p, s = ''] = token.split('.')
  if (!h || !p) throw new Error('decodeJwt: not a JWT (expected header.payload.signature)')
  const parse = (seg: string, what: string): Record<string, unknown> => {
    try {
      return JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'))
    } catch {
      throw new Error(`decodeJwt: ${what} is not valid base64url JSON`)
    }
  }
  return { header: parse(h, 'header'), payload: parse(p, 'payload'), signature: s }
}

/** The token's `exp` claim as a Date (UTC), or null when the token has no `exp`. Reads the claim
 *  only — no signature check, no secret needed. */
export function jwtExpiry(token: string): Date | null {
  const exp = decodeJwt(token).payload.exp
  return typeof exp === 'number' ? new Date(exp * 1000) : null
}

/**
 * True if the token's `exp` is in the past (optionally treating it as expired `skewSec` early).
 * NOTE: this reads the CLAIM only. This API is session-authoritative (it validates by accessUUID),
 * so a not-yet-expired token can STILL be rejected if its server-side session was revoked (logout /
 * single-session-kick). Use this to schedule a refresh or for diagnostics — not to assume the API
 * will accept the token.
 */
export function isJwtExpired(token: string, skewSec = 0): boolean {
  const exp = decodeJwt(token).payload.exp
  if (typeof exp !== 'number') return false
  return Date.now() / 1000 >= exp - skewSec
}

export interface SignOptions {
  /** Seconds until expiry — fills `iat` + `exp` if the payload doesn't already set them. */
  expiresInSec?: number
  /** Algorithm header value. Only HS256 is implemented; override only if BE confirms otherwise. */
  alg?: 'HS256'
}

/**
 * Mint (sign) an HS256 JWT with the given secret. `payload` is signed verbatim plus optional
 * timing claims. The result is a fully valid token — the API's signature check will pass, so a
 * subsequent business check (scope / status / ...) is what the test actually exercises.
 */
export function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  opts: SignOptions = {},
): string {
  if (!secret) throw new Error('signJwt: empty secret')
  const header = { alg: opts.alg ?? 'HS256', typ: 'JWT' }
  const body: Record<string, unknown> = { ...payload }
  if (opts.expiresInSec !== undefined) {
    const now = Math.floor(Date.now() / 1000)
    body.iat ??= now
    body.exp ??= now + opts.expiresInSec
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url')
  return `${signingInput}.${signature}`
}

/** Verify an HS256 signature against a secret (constant-time). Handy for self-tests / debugging. */
export function verifyJwt(token: string, secret: string): boolean {
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) return false
  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')
  const a = Buffer.from(s)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// --- signing-secret bindings -------------------------------------------------
// Read the backend-supplied secrets from env. Tests gate on `jwtSecretsConfigured()` and skip
// when the secrets are not set, so the suite stays green before they are provided.

const ACCESS_SECRET_ENV = 'JWT_ACCESS_SECRET'
const REFRESH_SECRET_ENV = 'JWT_REFRESH_SECRET'

/** True once the access signing secret is configured — gate forged-token tests on this. */
export function jwtSecretsConfigured(): boolean {
  return Boolean(process.env[ACCESS_SECRET_ENV])
}

function requireSecret(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} not set — required to mint a test token (ask the backend team)`)
  return v
}

/** Sign an access token with the BE access secret (defaults to a 15-min expiry). */
export function signAccessToken(payload: Record<string, unknown>, opts: SignOptions = {}): string {
  return signJwt(payload, requireSecret(ACCESS_SECRET_ENV), { expiresInSec: 15 * 60, ...opts })
}

/** Sign a refresh token with the BE refresh secret (defaults to an 8-hour expiry). */
export function signRefreshToken(payload: Record<string, unknown>, opts: SignOptions = {}): string {
  return signJwt(payload, requireSecret(REFRESH_SECRET_ENV), { expiresInSec: 8 * 60 * 60, ...opts })
}
