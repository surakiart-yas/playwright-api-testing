import { test, type APIRequestContext, type APIResponse, type TestInfo } from '@playwright/test'
import { attachApiInteraction } from './reporting'
import { logApiCall, maskSensitive } from './logging'

export interface RequestOptions {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload?: unknown
  headers?: Record<string, string>
  // Query params are serialised to a query string. `undefined` / `null` values
  // are dropped (otherwise `URLSearchParams` would emit literal "undefined").
  params?: Record<string, string | number | boolean | undefined | null>
  label?: string
}

export interface RequestResult<T> {
  res: APIResponse
  json: T
  responseMs: number
}

export async function sendRequest<T>(
  request: APIRequestContext,
  baseUrl: string,
  options: RequestOptions,
  testInfo?: TestInfo,
): Promise<RequestResult<T>> {
  const { path, method, payload, headers, params, label } = options
  let url = `${baseUrl}/${path}`.replace(/([^:])\/\//g, '$1/')
  if (params) {
    const entries = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)] as [string, string])
    if (entries.length > 0) {
      url += `?${new URLSearchParams(entries)}`
    }
  }

  // Strip Content-Type on bodyless verbs — some real APIs / WAFs reject
  // GET/DELETE that carry a Content-Type header. The mock doesn't enforce
  // this, so this is template-correctness, not mock-correctness.
  const sendHeaders =
    payload === undefined && headers
      ? Object.fromEntries(
          Object.entries(headers).filter(([k]) => k.toLowerCase() !== 'content-type'),
        )
      : headers

  const name = label ?? `${method} /${path}`

  // The actual fetch + JSON parse + (masked) attachment. When a TestInfo is present we run it
  // INSIDE a boxed `test.step(name)` so the report nests the request/response attachment UNDER
  // its call (one collapsible node) instead of dumping every attachment flat at the test root.
  // With NO TestInfo (provisioning setup / worker teardown cleanup), there is no step and no
  // attach — those calls stay out of the report entirely. (`box: true` keeps the call's internal
  // Playwright fetch step collapsed; SLA / schema assertions live in the caller, outside the box.)
  const run = async (): Promise<RequestResult<T>> => {
    const start = Date.now()
    const res = await request.fetch(url, {
      method,
      headers: sendHeaders,
      data: payload !== undefined ? JSON.stringify(payload) : undefined,
    })
    const responseMs = Date.now() - start

    // Only parse JSON for responses that carry a body
    const contentType = res.headers()['content-type'] ?? ''
    const hasBody = res.status() !== 204 && res.status() !== 304
    const json = (
      hasBody && contentType.includes('application/json')
        ? await res.json().catch(() => null)
        : null
    ) as T

    const safeHeaders = maskSensitive(headers ?? {}) as Record<string, string>
    const safeBody = maskSensitive(payload)

    if (testInfo) {
      await attachApiInteraction(testInfo, name, {
        request: { method, url, headers: safeHeaders, body: safeBody },
        response: { status: res.status(), responseMs, body: json },
      })
    }
    logApiCall(
      name,
      method,
      url,
      responseMs,
      res.status(),
      safeHeaders,
      payload,
      json,
      testInfo?.title,
    )
    return { res, json, responseMs }
  }

  return testInfo ? test.step(name, run, { box: true }) : run()
}
