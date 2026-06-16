import { test, expect, CommentsValidator } from '../fixtures'
import { HttpStatus } from '@core/types'
import { CommentMessage } from '@services/comments/types'
import { TOKEN_REQUIRED } from '../../helpers'
import { autotestSlug } from '@utils/test-data'

test(
  'Comment flow: create → get → delete → verify gone',
  {
    tag: ['@flow', '@smoke', '@regression', '@comments'],
    annotation: [{ type: 'allure.label.tc', description: 'TC-210' }],
  },
  async ({ commentsClient, commentsProvisioner }) => {
    test.skip(!commentsProvisioner, TOKEN_REQUIRED)
    const postId = await commentsProvisioner!.getParentPostId()
    const slug = autotestSlug('comment')
    let id = 0

    await test.step('Create comment', async () => {
      const res = await commentsClient!.createComment(postId, {
        name: slug,
        email: `${slug}@example.com`,
        body: `${slug} body`,
      })
      await CommentsValidator.expectCommentSuccess(res, HttpStatus.CREATED)
      id = (await res.json()).id
      commentsProvisioner!.track(id)
    })

    await test.step('Get by id and verify fields', async () => {
      const res = await commentsClient!.getComment(id)
      await CommentsValidator.expectCommentSuccess(res)
      expect(await res.json()).toMatchObject({ id, post_id: postId, name: slug })
    })

    await test.step('Delete comment', async () => {
      const res = await commentsClient!.deleteComment(id)
      await CommentsValidator.expectDeleteSuccess(res)
    })

    await test.step('Verify comment is gone', async () => {
      const res = await commentsClient!.getComment(id)
      await CommentsValidator.expectMessageError(
        res,
        HttpStatus.NOT_FOUND,
        CommentMessage.NOT_FOUND,
      )
    })
  },
)
