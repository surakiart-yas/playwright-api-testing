import { test, expect, PostsValidator } from './fixtures'
import { TOKEN_REQUIRED } from '../helpers'

test.describe('GET /users/:id/posts', { tag: ['@isolated', '@posts'] }, () => {
  test(
    "should list a user's posts",
    {
      tag: ['@smoke', '@regression'],
      annotation: [{ type: 'allure.label.tc', description: 'TC-101' }],
    },
    async ({ postsClient, postsProvisioner }) => {
      test.skip(!postsProvisioner, TOKEN_REQUIRED)
      // ensure the parent user has at least one post, then list it back
      const subject = await postsProvisioner!.getSubjectPost()
      const res = await postsClient!.listUserPosts(subject.user_id)
      await PostsValidator.expectPostListSuccess(res)
      const json = await res.json()
      // every item in a nested list must belong to the parent user
      for (const post of json) {
        expect(post.user_id, 'nested list must be scoped to the user').toBe(subject.user_id)
      }
    },
  )
})
