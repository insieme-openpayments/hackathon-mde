import { APIError } from '@/lib/fetcher.ts'
import { SuccessResponse } from '@/lib/types.ts'
import { UseMutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { useCustomMutation } from './use-custom-mutation.ts'
import { finishOrderSchema, type SetupFinishResponse } from '@insieme/shared'

type FinishSetupMutationParams = z.infer<typeof finishSetupSchema>

export const finishSetupSchema = finishOrderSchema.extend({
  identifier: z.string().uuid()
})

export function useFinishSetupMutation(
  options?: UseMutationOptions<
    SuccessResponse<SetupFinishResponse>,
    APIError<z.infer<typeof finishSetupSchema>>,
    FinishSetupMutationParams
  >
) {
  return useCustomMutation(
    {
      endpoint: '/orders/setup-one-click/finish',
      method: 'POST'
    },
    options
  )
}
