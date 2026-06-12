import type { APIRequestContext } from '@playwright/test'

// ADAPT: change healthPath to your API's health check endpoint
export async function warmUpConnection(
  request: APIRequestContext,
  baseUrl: string,
  healthPath = 'health',
): Promise<void> {
  for (let i = 0; i < 3; i++) {
    try {
      await request.get(`${baseUrl}/${healthPath}`)
      return
    } catch {
      if (i < 2) await new Promise((r) => setTimeout(r, 500))
    }
  }
}
