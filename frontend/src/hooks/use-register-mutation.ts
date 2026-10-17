import { useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import type { z } from 'zod'
import { registerSchema, type SessionResponse } from '@insieme/shared'
import type { APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import { useCustomMutation } from './use-custom-mutation.ts'

export type RegisterParams = z.input<typeof registerSchema>

export function useRegisterMutation(
  options?: UseMutationOptions<
    SuccessResponse<SessionResponse>,
    APIError<RegisterParams>,
    RegisterParams
  >
) {
  const queryClient = useQueryClient()
  return useCustomMutation<RegisterParams, SessionResponse, RegisterParams>(
    { endpoint: '/auth/register', method: 'POST' },
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.removeQueries({ queryKey: ['me'] })
        return options?.onSuccess?.(...args)
      }
    }
  )
}
