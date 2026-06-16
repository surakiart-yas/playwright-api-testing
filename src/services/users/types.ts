// GoRest users domain types — https://gorest.co.in/public/v2/users (a PUBLIC practice API).
// Contract source: live probes + https://gorest.co.in/ docs.
//
// TEACHING POINT (lesson 2): GoRest's envelope is NOTHING like the template's
// `{ code: 'OK', ... }` — v2 returns the BARE resource (no wrapper), 401/404 errors are
// `{ message }`, and 422 validation errors are an ARRAY of `{ field, message }`. This is
// why you re-derive the envelope per API instead of reusing another service's schemas.
import type { z } from 'zod'
import type { userData } from './schemas'

export interface CreateUserRequest {
  name: string
  email: string
  gender: GenderValue
  status: UserStatusValue
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  gender?: GenderValue
  status?: UserStatusValue
}

export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
} as const

export type GenderValue = (typeof Gender)[keyof typeof Gender]

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const

export type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus]

// Response data type — inferred from the schema (single source).
export type User = z.infer<typeof userData>

// GoRest has no business-code catalog (no envelope) — the error MESSAGES are the
// only stable sentinel, so they live here as constants for assertions.
export const UserMessage = {
  AUTH_FAILED: 'Authentication failed',
  NOT_FOUND: 'Resource not found',
  BLANK: "can't be blank",
  EMAIL_TAKEN: 'has already been taken',
} as const
