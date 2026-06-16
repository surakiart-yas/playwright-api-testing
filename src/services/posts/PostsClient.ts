import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { BaseClient } from '@core/BaseClient'
import type { ApiConfig } from '@core/types'
import type { CreatePostRequest, Post } from './types'

export type ListPostsParams = {
  page?: number
  per_page?: number
}

/**
 * AOM client สำหรับ GoRest `posts` resource — nested under users.
 * create อยู่ที่ /users/{userId}/posts; read/delete ที่ /posts/{id}
 */
export class PostsClient extends BaseClient {
  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    super(config, request, testInfo)
  }

  async createPost(
    userId: number,
    body: CreatePostRequest | Record<string, unknown>,
  ): Promise<APIResponse> {
    return this.post<Post>(`users/${userId}/posts`, body, undefined, 'Create Post')
  }

  async getPost(id: number): Promise<APIResponse> {
    return this.get<Post>(`posts/${id}`, undefined, undefined, 'Get Post')
  }

  async listUserPosts(userId: number, params?: ListPostsParams): Promise<APIResponse> {
    return this.get<Post[]>(`users/${userId}/posts`, params, undefined, 'List User Posts')
  }

  // 204 No Content on success.
  async deletePost(id: number): Promise<APIResponse> {
    return this.del<never>(`posts/${id}`, undefined, 'Delete Post')
  }
}
