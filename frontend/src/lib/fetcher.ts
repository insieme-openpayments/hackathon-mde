import type { FieldValues, FieldPath } from 'react-hook-form'
import { API_BASE_URL } from './constants.ts'
import { ErrorResponse, SuccessResponse } from './types.ts'
import { authStore, clearSession } from './stores/auth-store.ts'

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type Errors<T = undefined> = T extends FieldValues
  ? Record<FieldPath<T>, string>
  : undefined

export class APIError<T = undefined> extends Error {
  public readonly success: boolean = false
  public readonly errors?: Errors<T>

  constructor(message: string, errors: Errors<T>) {
    super(message)
    this.errors = errors
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetcher<JSON = any>(
  input: string,
  options?: RequestInit
): Promise<SuccessResponse<JSON>> {
  const token = authStore.token
  const response = await fetch(API_BASE_URL + input, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> | undefined)
    }
  })
  const json = await response.json()
  if (!response.ok) {
    // Session expired or invalid: only for account endpoints. Never for
    // /orders/*, where a 401 means the Open Payments token expired.
    if (
      response.status === 401 &&
      (input.startsWith('/auth/') || input.startsWith('/me'))
    ) {
      clearSession()
    }
    const error = json as ErrorResponse
    throw new APIError(error.message, error.errors as unknown as Errors)
  }

  return json
}
