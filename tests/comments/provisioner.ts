import { test, type APIRequestContext, type TestInfo } from '@playwright/test'
import { UsersClient } from '@services/users/UsersClient'
import { Gender, UserStatus } from '@services/users/types'
import { PostsClient } from '@services/posts/PostsClient'
import { CommentsClient } from '@services/comments/CommentsClient'
import type { Comment } from '@services/comments/types'
import type { ApiConfig } from '@core/types'
import { autotestSlug } from '@utils/test-data'
import { attachReusedSubject } from '@utils/reporting'

const PROVISION_MAX_RESPONSE_MS = 30_000

/**
 * Cross-resource provisioning — chain ลึกสุด: comment ใต้ post ใต้ user
 * สร้าง parent user + parent post หนึ่งชุด (cache) แล้วสร้าง comment ใต้ post นั้น
 * cleanup ลบย้อนลำดับ: comment → post → user
 */
export class CommentsProvisioner {
  private parentUserId?: number
  private parentPostId?: number
  private subjectComment?: Comment
  private readonly createdComments: number[] = []
  private readonly createdPosts: number[] = []
  private readonly createdUsers: number[] = []

  constructor(
    private readonly config: ApiConfig,
    private readonly request: APIRequestContext,
  ) {}

  private step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return test.step(name, fn, { box: true })
  }

  async getSubjectComment(): Promise<Comment> {
    if (this.subjectComment) {
      await attachReusedSubject('subject comment', this.subjectComment)
      return this.subjectComment
    }
    return this.step('Precondition: provision subject comment', async () => {
      this.subjectComment = await this.createTrackedComment()
      return this.subjectComment
    })
  }

  async createDisposableComment(): Promise<Comment> {
    return this.step('Precondition: provision disposable comment', () =>
      this.createTrackedComment(),
    )
  }

  /** The cached parent post id — exposed so tests can build nested comment paths. */
  async getParentPostId(): Promise<number> {
    await this.ensureParentPost()
    return this.parentPostId!
  }

  track(id: number): void {
    if (!this.createdComments.includes(id)) this.createdComments.push(id)
  }

  async cleanup(): Promise<void> {
    for (const id of this.createdComments)
      await this.safeDelete(() => this.comments(true).deleteComment(id))
    for (const id of this.createdPosts) await this.safeDelete(() => this.posts(true).deletePost(id))
    for (const id of this.createdUsers) await this.safeDelete(() => this.users(true).deleteUser(id))
  }

  // --- internals --------------------------------------------------------------

  private async safeDelete(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn()
    } catch {
      // best-effort
    }
  }

  private get activeTestInfo(): TestInfo | undefined {
    try {
      return test.info()
    } catch {
      return undefined
    }
  }

  private get provisionConfig(): ApiConfig {
    return {
      ...this.config,
      responseTargetMs: PROVISION_MAX_RESPONSE_MS,
      responseCeilingMs: PROVISION_MAX_RESPONSE_MS,
    }
  }

  private users(noAttach = false): UsersClient {
    return new UsersClient(
      this.provisionConfig,
      this.request,
      noAttach ? undefined : this.activeTestInfo,
    )
  }
  private posts(noAttach = false): PostsClient {
    return new PostsClient(
      this.provisionConfig,
      this.request,
      noAttach ? undefined : this.activeTestInfo,
    )
  }
  private comments(noAttach = false): CommentsClient {
    return new CommentsClient(
      this.provisionConfig,
      this.request,
      noAttach ? undefined : this.activeTestInfo,
    )
  }

  private async ensureParentPost(): Promise<number> {
    if (this.parentPostId) return this.parentPostId
    // 1. parent user
    const uslug = autotestSlug('commentowner')
    const ures = await this.users().createUser({
      name: uslug,
      email: `${uslug}@example.com`,
      gender: Gender.MALE,
      status: UserStatus.ACTIVE,
    })
    const ujson = await ures.json()
    if (ures.status() !== 201 || typeof ujson?.id !== 'number') {
      throw new Error(
        `Provisioning parent user failed: HTTP ${ures.status()} ${JSON.stringify(ujson)}`,
      )
    }
    const userId: number = ujson.id
    this.parentUserId = userId
    this.createdUsers.push(userId)
    // 2. parent post
    const pslug = autotestSlug('commentpost')
    const pres = await this.posts().createPost(userId, { title: pslug, body: `${pslug} body` })
    const pjson = await pres.json()
    if (pres.status() !== 201 || typeof pjson?.id !== 'number') {
      throw new Error(
        `Provisioning parent post failed: HTTP ${pres.status()} ${JSON.stringify(pjson)}`,
      )
    }
    this.parentPostId = pjson.id
    this.createdPosts.push(pjson.id)
    return pjson.id
  }

  private async createTrackedComment(): Promise<Comment> {
    const postId = await this.ensureParentPost()
    const slug = autotestSlug('comment')
    const res = await this.comments().createComment(postId, {
      name: slug,
      email: `${slug}@example.com`,
      body: `${slug} body`,
    })
    const json = await res.json()
    // Setup failures THROW, never skip (docs/decisions.md §6).
    if (res.status() !== 201 || typeof json?.id !== 'number') {
      throw new Error(`Provisioning comment failed: HTTP ${res.status()} ${JSON.stringify(json)}`)
    }
    this.createdComments.push(json.id)
    return json as Comment
  }
}
