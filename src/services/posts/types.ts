// GoRest posts domain — https://gorest.co.in/public/v2 (nested under users).
// POST is at /users/{user_id}/posts; read/delete at /posts/{id}.
import type { z } from 'zod'
import type { postData } from './schemas'

export interface CreatePostRequest {
  title: string
  body: string
}

// Response data type — inferred from the schema (single source).
export type Post = z.infer<typeof postData>

// GoRest error MESSAGES are the only stable sentinel (no envelope/code catalog).
export const PostMessage = {
  AUTH_FAILED: 'Authentication failed',
  NOT_FOUND: 'Resource not found',
  BLANK: "can't be blank",
} as const
