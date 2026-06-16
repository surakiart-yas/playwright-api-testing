import { test, expect, CommentsValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { CommentMessage } from '@services/comments/types'
import { TOKEN_REQUIRED } from '../helpers'
import { autotestSlug } from '@utils/test-data'

test.describe('POST /posts/:id/comments', { tag: ['@isolated', '@comments'] }, () => {
  test.describe('Positive Testing', () => {
    test(
      'should create a comment on a post',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-202' }],
      },
      async ({ commentsClient, commentsProvisioner }) => {
        test.skip(!commentsProvisioner, TOKEN_REQUIRED)
        const postId = await commentsProvisioner!.getParentPostId()
        const slug = autotestSlug('comment')
        const res = await commentsClient!.createComment(postId, {
          name: slug,
          email: `${slug}@example.com`,
          body: `${slug} body`,
        })
        const json = await res.json()
        if (typeof json?.id === 'number') commentsProvisioner!.track(json.id)
        await CommentsValidator.expectCommentSuccess(res, HttpStatus.CREATED)
        expect(json).toMatchObject({ post_id: postId, name: slug, body: `${slug} body` })
      },
    )
  })

  test.describe('Negative Testing', () => {
    test(
      'should reject a comment without a body',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-203' }] },
      async ({ commentsClient, commentsProvisioner }) => {
        test.skip(!commentsProvisioner, TOKEN_REQUIRED)
        const postId = await commentsProvisioner!.getParentPostId()
        const slug = autotestSlug()
        const res = await commentsClient!.createComment(postId, {
          name: slug,
          email: `${slug}@example.com`,
        })
        await CommentsValidator.expectFieldErrors(res, [
          { field: 'body', messageContains: CommentMessage.BLANK },
        ])
      },
    )

    test(
      'should reject a comment without a token',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-204' }] },
      async ({ publicClient, commentsProvisioner }) => {
        test.skip(!commentsProvisioner, TOKEN_REQUIRED)
        const postId = await commentsProvisioner!.getParentPostId()
        const slug = autotestSlug()
        const res = await publicClient.createComment(postId, {
          name: slug,
          email: `${slug}@example.com`,
          body: 'x',
        })
        await CommentsValidator.expectMessageError(
          res,
          HttpStatus.UNAUTHORIZED,
          CommentMessage.AUTH_FAILED,
        )
      },
    )
  })
})
