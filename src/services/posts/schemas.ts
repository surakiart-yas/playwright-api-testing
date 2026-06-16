// GoRest posts schemas (Zod) — bare resource, no envelope (same shape rules as users).
// looseObject keeps unknown/leaked fields visible — see docs/decisions.md §3 + §12.
import { z } from 'zod'

export const postData = z.looseObject({
  id: z.number().int(),
  user_id: z.number().int(),
  title: z.string(),
  body: z.string(),
})

// 401 / 404 — single message object.
const messageError = z.looseObject({ message: z.string() })

// 422 — per-field validation errors, bare ARRAY.
const fieldErrors = z.array(z.looseObject({ field: z.string(), message: z.string() }))

export const PostsSchemas = {
  post: postData,
  postList: z.array(postData),
  messageError,
  fieldErrors,
}
