// GoRest comments schemas (Zod) — bare resource. looseObject keeps unknown/leaked fields
// visible — see docs/decisions.md §3 + §12.
import { z } from 'zod'

export const commentData = z.looseObject({
  id: z.number().int(),
  post_id: z.number().int(),
  name: z.string(),
  email: z.string(),
  body: z.string(),
})

const messageError = z.looseObject({ message: z.string() })
const fieldErrors = z.array(z.looseObject({ field: z.string(), message: z.string() }))

export const CommentsSchemas = {
  comment: commentData,
  commentList: z.array(commentData),
  messageError,
  fieldErrors,
}
