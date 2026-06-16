import { test, PostsValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { PostMessage } from '@services/posts/types'
import { TOKEN_REQUIRED } from '../helpers'

test.describe('GET /posts/:id', { tag: ['@isolated', '@posts'] }, () => {
  test.describe('Negative Testing', () => {
    test(
      'should return 404 for a non-existent post',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-105' }] },
      async ({ postsClient }) => {
        test.skip(!postsClient, TOKEN_REQUIRED)
        const res = await postsClient!.getPost(999_999_999)
        await PostsValidator.expectMessageError(res, HttpStatus.NOT_FOUND, PostMessage.NOT_FOUND)
      },
    )
  })
})
