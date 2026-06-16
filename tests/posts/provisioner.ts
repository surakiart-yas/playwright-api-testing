import { test, type APIRequestContext, type TestInfo } from '@playwright/test'
import { UsersClient } from '@services/users/UsersClient'
import { Gender, UserStatus } from '@services/users/types'
import { PostsClient } from '@services/posts/PostsClient'
import type { Post } from '@services/posts/types'
import type { ApiConfig } from '@core/types'
import { autotestSlug } from '@utils/test-data'
import { attachReusedSubject } from '@utils/reporting'

const PROVISION_MAX_RESPONSE_MS = 30_000

/**
 * Cross-resource provisioning: post ต้องมี parent user เสมอ (GoRest nests posts under users).
 * Provisioner สร้าง parent user หนึ่งตัว (cache ไว้) แล้วสร้าง post ใต้ user นั้น
 * cleanup ลบ post ก่อน แล้วค่อยลบ user (ลบ user เฉยๆ GoRest cascade posts อยู่แล้ว แต่ลบ
 * ตามลำดับชัดเจนกว่า)
 */
export class PostsProvisioner {
  private parentUserId?: number
  private subjectPost?: Post
  private readonly createdPosts: number[] = []
  private readonly createdUsers: number[] = []

  constructor(
    private readonly config: ApiConfig,
    private readonly request: APIRequestContext,
  ) {}

  private step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return test.step(name, fn, { box: true })
  }

  /** A post for read-only tests. Cached + reused across the worker's tests. */
  async getSubjectPost(): Promise<Post> {
    if (this.subjectPost) {
      await attachReusedSubject('subject post', this.subjectPost)
      return this.subjectPost
    }
    return this.step('Precondition: provision subject post', async () => {
      this.subjectPost = await this.createTrackedPost()
      return this.subjectPost
    })
  }

  /** A fresh post for a destructive test. */
  async createDisposablePost(): Promise<Post> {
    return this.step('Precondition: provision disposable post', () => this.createTrackedPost())
  }

  /** The cached parent user id — exposed so tests can build nested paths. */
  async getParentUserId(): Promise<number> {
    await this.ensureParentUser()
    return this.parentUserId!
  }

  /** Register a post id created by a test directly, so worker teardown cleans it up. */
  track(id: number): void {
    if (!this.createdPosts.includes(id)) this.createdPosts.push(id)
  }

  /** Teardown: delete posts then users (404 = already gone). */
  async cleanup(): Promise<void> {
    for (const id of this.createdPosts) await this.safeDelete(() => this.posts(true).deletePost(id))
    for (const id of this.createdUsers) await this.safeDelete(() => this.users(true).deleteUser(id))
  }

  // --- internals --------------------------------------------------------------

  private async safeDelete(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn()
    } catch {
      // best-effort — a failed cleanup must not fail the run
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

  private async ensureParentUser(): Promise<number> {
    if (this.parentUserId) return this.parentUserId
    const slug = autotestSlug('postowner')
    const res = await this.users().createUser({
      name: slug,
      email: `${slug}@example.com`,
      gender: Gender.MALE,
      status: UserStatus.ACTIVE,
    })
    const json = await res.json()
    if (res.status() !== 201 || typeof json?.id !== 'number') {
      throw new Error(
        `Provisioning parent user failed: HTTP ${res.status()} ${JSON.stringify(json)}`,
      )
    }
    this.parentUserId = json.id
    this.createdUsers.push(json.id)
    return json.id
  }

  private async createTrackedPost(): Promise<Post> {
    const userId = await this.ensureParentUser()
    const slug = autotestSlug('post')
    const res = await this.posts().createPost(userId, { title: slug, body: `${slug} body` })
    const json = await res.json()
    // Setup failures THROW, never skip (docs/decisions.md §6).
    if (res.status() !== 201 || typeof json?.id !== 'number') {
      throw new Error(`Provisioning post failed: HTTP ${res.status()} ${JSON.stringify(json)}`)
    }
    this.createdPosts.push(json.id)
    return json as Post
  }
}
