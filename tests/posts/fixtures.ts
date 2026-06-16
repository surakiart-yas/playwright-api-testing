import { test as base, expect } from '@fixtures/base'
import { loadApiConfig } from '@config/api-config'
import { PostsClient } from '@services/posts/PostsClient'
import { PostsValidator } from '@services/posts/PostsValidator'
import { PostsProvisioner } from './provisioner'
import { getGoRestToken, gorestConfig } from '../helpers'

export { expect, PostsValidator }

type PostsFixtures = {
  postsClient: PostsClient | undefined // token-bearing; undefined when GOREST_TOKEN unset
  publicClient: PostsClient // tokenless; drives the "no auth → 401" negative
}

type PostsWorkerFixtures = {
  postsProvisioner: PostsProvisioner | undefined
}

export const test = base.extend<PostsFixtures, PostsWorkerFixtures>({
  postsClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    const token = getGoRestToken()
    await use(
      token ? new PostsClient(gorestConfig(apiConfig, token), workerRequest, testInfo) : undefined,
    )
  },

  publicClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    await use(new PostsClient(gorestConfig(apiConfig), workerRequest, testInfo))
  },

  postsProvisioner: [
    async ({ workerRequest }, use) => {
      const token = getGoRestToken()
      if (!token) {
        await use(undefined)
        return
      }
      const provisioner = new PostsProvisioner(gorestConfig(loadApiConfig(), token), workerRequest)
      await use(provisioner)
      await provisioner.cleanup()
    },
    { scope: 'worker' },
  ],
})
