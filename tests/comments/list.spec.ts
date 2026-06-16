import { test, expect, CommentsValidator } from './fixtures'
import { TOKEN_REQUIRED } from '../helpers'

test.describe('GET /posts/:id/comments', { tag: ['@isolated', '@comments'] }, () => {
  test(
    "should list a post's comments",
    {
      tag: ['@smoke', '@regression'],
      annotation: [{ type: 'allure.label.tc', description: 'TC-201' }],
    },
    async ({ commentsClient, commentsProvisioner }) => {
      test.skip(!commentsProvisioner, TOKEN_REQUIRED)
      const subject = await commentsProvisioner!.getSubjectComment()
      const res = await commentsClient!.listPostComments(subject.post_id)
      await CommentsValidator.expectCommentListSuccess(res)
      const json = await res.json()
      for (const comment of json) {
        expect(comment.post_id, 'nested list must be scoped to the post').toBe(subject.post_id)
      }
    },
  )
})
