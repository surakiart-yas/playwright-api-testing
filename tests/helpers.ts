import type { ApiConfig } from '@core/types'

// GoRest is a PUBLIC practice API — this URL is intentionally committed (it is the whole
// point: everyone hits the same endpoint). Deterministic value → constant in code, env
// override only for proxies (docs/decisions.md §17 spirit). Never commit a COMPANY host.
export const GOREST_BASE_URL = process.env.GOREST_BASE_URL ?? 'https://gorest.co.in/public/v2'

/** GoRest writes ต้องการ Bearer token (ฟรี: https://gorest.co.in/consumer/login → API tokens)
 *  เมื่อไม่ได้ตั้งค่า GOREST_TOKEN ทุก test จะ skip อัตโนมัติ */
export function getGoRestToken(): string | undefined {
  const v = process.env.GOREST_TOKEN?.trim()
  return v ? v : undefined
}

export const TOKEN_REQUIRED =
  'requires a GoRest token — set GOREST_TOKEN (free at https://gorest.co.in/consumer/login)'

/** Base URL + token inject สำหรับ GoRest — override base URL และแนบ token ให้ client */
export function gorestConfig(base: ApiConfig, token?: string): ApiConfig {
  return { ...base, baseUrl: GOREST_BASE_URL, authToken: token }
}
