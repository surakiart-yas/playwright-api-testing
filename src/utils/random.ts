import { randomBytes } from 'crypto'

export function randomAlphanumericCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(randomBytes(length))
    .map((b) => chars[b % chars.length])
    .join('')
}

export function randomNumericCode(length: number): string {
  return Array.from(randomBytes(length))
    .map((b) => String(b % 10))
    .join('')
}

export function randomUUID(): string {
  return crypto.randomUUID()
}

export function randomPrefixedId(prefix: string, length = 8): string {
  return `${prefix}-${randomAlphanumericCode(length)}`
}
