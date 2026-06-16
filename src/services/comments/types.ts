// GoRest comments domain — nested under posts. POST at /posts/{post_id}/comments;
// read/delete at /comments/{id}.
import type { z } from 'zod'
import type { commentData } from './schemas'

export interface CreateCommentRequest {
  name: string
  email: string
  body: string
}

export type Comment = z.infer<typeof commentData>

export const CommentMessage = {
  AUTH_FAILED: 'Authentication failed',
  NOT_FOUND: 'Resource not found',
  BLANK: "can't be blank",
} as const
