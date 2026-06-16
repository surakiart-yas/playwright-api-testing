import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { BaseClient } from '@core/BaseClient'
import type { ApiConfig } from '@core/types'
import type { Comment, CreateCommentRequest } from './types'

export type ListCommentsParams = {
  page?: number
  per_page?: number
}

/**
 * AOM client สำหรับ GoRest `comments` resource — nested under posts.
 * create ที่ /posts/{postId}/comments; read/delete ที่ /comments/{id}
 */
export class CommentsClient extends BaseClient {
  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    super(config, request, testInfo)
  }

  async createComment(
    postId: number,
    body: CreateCommentRequest | Record<string, unknown>,
  ): Promise<APIResponse> {
    return this.post<Comment>(`posts/${postId}/comments`, body, undefined, 'Create Comment')
  }

  async getComment(id: number): Promise<APIResponse> {
    return this.get<Comment>(`comments/${id}`, undefined, undefined, 'Get Comment')
  }

  async listPostComments(postId: number, params?: ListCommentsParams): Promise<APIResponse> {
    return this.get<Comment[]>(`posts/${postId}/comments`, params, undefined, 'List Post Comments')
  }

  // 204 No Content on success.
  async deleteComment(id: number): Promise<APIResponse> {
    return this.del<never>(`comments/${id}`, undefined, 'Delete Comment')
  }
}
