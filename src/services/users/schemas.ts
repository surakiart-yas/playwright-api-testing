// GoRest response schemas (Zod) — NOTE: no success envelope exists on this API.
// v2 returns the bare resource (create/get/update), a bare array (list), nothing (delete
// 204), `{ message }` for 401/404, and `[{ field, message }]` for 422 validation.
// Resources use `looseObject` so any field GoRest adds (or leaks) stays visible to
// assertions — see docs/decisions.md §3 (loose vs strict) + §12 (Zod conventions).
import { z } from 'zod'
import { Gender, UserStatus } from './types'

export const userData = z.looseObject({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  gender: z.enum([Gender.MALE, Gender.FEMALE]),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]),
})

// 401 / 404 — a single message object.
const messageError = z.looseObject({
  message: z.string(),
})

// 422 — per-field validation errors, ARRAY at the top level (no wrapper).
const fieldErrors = z.array(
  z.looseObject({
    field: z.string(),
    message: z.string(),
  }),
)

export const UsersSchemas = {
  user: userData,
  userList: z.array(userData),
  messageError,
  fieldErrors,
}
