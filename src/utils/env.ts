import * as dotenv from 'dotenv'
import * as path from 'path'

let loaded = false

export function loadEnv(): void {
  if (loaded) return
  loaded = true
  const env = process.env.TEST_ENV ?? 'local'
  // quiet: true ปิด tip banner ของ dotenv v17 (◇ injected env … tip: …)
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`), quiet: true })
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
}
