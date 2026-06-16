import { test, expect, PostsValidator } from '../fixtures'
import { HttpStatus } from '@core/types'
import { PostMessage } from '@services/posts/types'
import { TOKEN_REQUIRED } from '../../helpers'
import { autotestSlug } from '@utils/test-data'

test(
  'Post flow: create → get → delete → verify gone',
  {
    tag: ['@flow', '@smoke', '@regression', '@posts'],
    annotation: [{ type: 'allure.label.tc', description: 'TC-110' }],
  },
  async ({ postsClient, postsProvisioner }) => {
    test.skip(!postsProvisioner, TOKEN_REQUIRED)
    const userId = await postsProvisioner!.getParentUserId()
    const slug = autotestSlug('post')
    let id = 0

    await test.step('Create post', async () => {
      const res = await postsClient!.createPost(userId, { title: slug, body: `${slug} body` })
      await PostsValidator.expectPostSuccess(res, HttpStatus.CREATED)
      id = (await res.json()).id
      postsProvisioner!.track(id) // safety net if a later step fails
    })

    await test.step('Get by id and verify fields', async () => {
      const res = await postsClient!.getPost(id)
      await PostsValidator.expectPostSuccess(res)
      expect(await res.json()).toMatchObject({ id, user_id: userId, title: slug })
    })

    await test.step('Delete post', async () => {
      const res = await postsClient!.deletePost(id)
      await PostsValidator.expectDeleteSuccess(res)
    })

    await test.step('Verify post is gone', async () => {
      const res = await postsClient!.getPost(id)
      await PostsValidator.expectMessageError(res, HttpStatus.NOT_FOUND, PostMessage.NOT_FOUND)
    })
  },
)
