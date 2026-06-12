import * as dotenv from 'dotenv'
import * as path from 'path'

let loaded = false

export function loadEnv(): void {
  if (loaded) return
  loaded = true
  const env = process.env.TEST_ENV ?? 'local'
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) })
  dotenv.config({ path: path.resolve(process.cwd(), '.env') })
}
