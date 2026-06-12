import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { sendRequest } from '@utils/http'
import { BaseValidator } from './BaseValidator'
import type { ApiConfig } from './types'

export abstract class BaseClient {
  protected readonly config: ApiConfig
  protected readonly request: APIRequestContext
  protected readonly testInfo?: TestInfo

  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    this.config = config
    this.request = request
    this.testInfo = testInfo
  }

  // ADAPT: override in subclass to add service-specific headers
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`
    }
    return headers
  }

  protected async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
    headers?: Record<string, string>,
    label?: string,
  ): Promise<APIResponse> {
    const { res, responseMs } = await sendRequest<T>(
      this.request,
      this.config.baseUrl,
      { path, method: 'GET', params, headers: { ...this.getAuthHeaders(), ...headers }, label },
      this.testInfo,
    )
    await BaseValidator.expectResponseTime(
      responseMs,
      this.config.responseTargetMs,
      this.config.responseCeilingMs,
    )
    return res
  }

  protected async post<T>(
    path: string,
    payload?: unknown,
    headers?: Record<string, string>,
    label?: string,
  ): Promise<APIResponse> {
    const { res, responseMs } = await sendRequest<T>(
      this.request,
      this.config.baseUrl,
      { path, method: 'POST', payload, headers: { ...this.getAuthHeaders(), ...headers }, label },
      this.testInfo,
    )
    await BaseValidator.expectResponseTime(
      responseMs,
      this.config.responseTargetMs,
      this.config.responseCeilingMs,
    )
    return res
  }

  protected async put<T>(
    path: string,
    payload?: unknown,
    headers?: Record<string, string>,
    label?: string,
  ): Promise<APIResponse> {
    const { res, responseMs } = await sendRequest<T>(
      this.request,
      this.config.baseUrl,
      { path, method: 'PUT', payload, headers: { ...this.getAuthHeaders(), ...headers }, label },
      this.testInfo,
    )
    await BaseValidator.expectResponseTime(
      responseMs,
      this.config.responseTargetMs,
      this.config.responseCeilingMs,
    )
    return res
  }

  protected async patch<T>(
    path: string,
    payload?: unknown,
    headers?: Record<string, string>,
    label?: string,
  ): Promise<APIResponse> {
    const { res, responseMs } = await sendRequest<T>(
      this.request,
      this.config.baseUrl,
      { path, method: 'PATCH', payload, headers: { ...this.getAuthHeaders(), ...headers }, label },
      this.testInfo,
    )
    await BaseValidator.expectResponseTime(
      responseMs,
      this.config.responseTargetMs,
      this.config.responseCeilingMs,
    )
    return res
  }

  protected async del<T>(
    path: string,
    headers?: Record<string, string>,
    label?: string,
  ): Promise<APIResponse> {
    const { res, responseMs } = await sendRequest<T>(
      this.request,
      this.config.baseUrl,
      { path, method: 'DELETE', headers: { ...this.getAuthHeaders(), ...headers }, label },
      this.testInfo,
    )
    await BaseValidator.expectResponseTime(
      responseMs,
      this.config.responseTargetMs,
      this.config.responseCeilingMs,
    )
    return res
  }
}
