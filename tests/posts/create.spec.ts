import { test, expect, PostsValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { PostMessage } from '@services/posts/types'
import { TOKEN_REQUIRED } from '../helpers'
import { autotestSlug } from '@utils/test-data'

test.describe('POST /users/:id/posts', { tag: ['@isolated', '@posts'] }, () => {
  test.describe('Positive Testing', () => {
    test(
      'should create a post for a user',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-102' }],
      },
      async ({ postsClient, postsProvisioner }) => {
        test.skip(!postsProvisioner, TOKEN_REQUIRED)
        const userId = await postsProvisioner!.getParentUserId()
        const slug = autotestSlug('post')
        const res = await postsClient!.createPost(userId, { title: slug, body: `${slug} body` })
        const json = await res.json()
        if (typeof json?.id === 'number') postsProvisioner!.track(json.id)
        await PostsValidator.expectPostSuccess(res, HttpStatus.CREATED)
        expect(json).toMatchObject({ user_id: userId, title: slug, body: `${slug} body` })
      },
    )
  })

  test.describe('Negative Testing', () => {
    test(
      'should reject a post without a title',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-103' }] },
      async ({ postsClient, postsProvisioner }) => {
        test.skip(!postsProvisioner, TOKEN_REQUIRED)
        const userId = await postsProvisioner!.getParentUserId()
        const res = await postsClient!.createPost(userId, { body: 'body only' })
        await PostsValidator.expectFieldErrors(res, [
          { field: 'title', messageContains: PostMessage.BLANK },
        ])
      },
    )

    test(
      'should reject a post without a token',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-104' }] },
      async ({ publicClient, postsProvisioner }) => {
        test.skip(!postsProvisioner, TOKEN_REQUIRED)
        const userId = await postsProvisioner!.getParentUserId()
        const res = await publicClient.createPost(userId, { title: autotestSlug(), body: 'x' })
        await PostsValidator.expectMessageError(
          res,
          HttpStatus.UNAUTHORIZED,
          PostMessage.AUTH_FAILED,
        )
      },
    )
  })
})
