import { test as base, expect } from '@fixtures/base'
import { loadApiConfig } from '@config/api-config'
import { CommentsClient } from '@services/comments/CommentsClient'
import { CommentsValidator } from '@services/comments/CommentsValidator'
import { CommentsProvisioner } from './provisioner'
import { getGoRestToken, gorestConfig } from '../helpers'

export { expect, CommentsValidator }

type CommentsFixtures = {
  commentsClient: CommentsClient | undefined
  publicClient: CommentsClient
}

type CommentsWorkerFixtures = {
  commentsProvisioner: CommentsProvisioner | undefined
}

export const test = base.extend<CommentsFixtures, CommentsWorkerFixtures>({
  commentsClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    const token = getGoRestToken()
    await use(
      token
        ? new CommentsClient(gorestConfig(apiConfig, token), workerRequest, testInfo)
        : undefined,
    )
  },

  publicClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    await use(new CommentsClient(gorestConfig(apiConfig), workerRequest, testInfo))
  },

  commentsProvisioner: [
    async ({ workerRequest }, use) => {
      const token = getGoRestToken()
      if (!token) {
        await use(undefined)
        return
      }
      const provisioner = new CommentsProvisioner(
        gorestConfig(loadApiConfig(), token),
        workerRequest,
      )
      await use(provisioner)
      await provisioner.cleanup()
    },
    { scope: 'worker' },
  ],
})
