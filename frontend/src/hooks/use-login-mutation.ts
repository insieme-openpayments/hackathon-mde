import { useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import type { z } from 'zod'
import { loginSchema, type SessionResponse } from '@insieme/shared'
import type { APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import { useCustomMutation } from './use-custom-mutation.ts'

export type LoginParams = z.input<typeof loginSchema>

export function useLoginMutation(
  options?: UseMutationOptions<
    SuccessResponse<SessionResponse>,
    APIError<LoginParams>,
    LoginParams
  >
) {
  const queryClient = useQueryClient()
  return useCustomMutation<LoginParams, SessionResponse, LoginParams>(
    { endpoint: '/auth/login', method: 'POST' },
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.removeQueries({ queryKey: ['me'] })
        return options?.onSuccess?.(...args)
      }
    }
  )
}
