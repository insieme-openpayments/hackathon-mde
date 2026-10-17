import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult
} from '@tanstack/react-query'
import type { z } from 'zod'
import type {
  SavedBill,
  saveBillSchema,
  updateBillSchema
} from '@insieme/shared'
import { fetcher, type APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import { useSession } from './use-auth.ts'

export const SAVED_BILLS_KEY = ['me', 'bills'] as const

export type SaveBillParams = z.input<typeof saveBillSchema>
export type UpdateBillParams = z.input<typeof updateBillSchema> & {
  id: string
}

/** GET /me/bills (only with a session). */
export function useSavedBills(): UseQueryResult<
  SuccessResponse<SavedBill[]>,
  APIError
> {
  const { token } = useSession()
  return useQuery({
    queryKey: SAVED_BILLS_KEY,
    enabled: token !== '',
    queryFn: async () =>
      await fetcher<SavedBill[]>('/me/bills', { method: 'GET' })
  })
}

/** POST /me/bills: a repeated (productId, ref1) returns the existing bill updated. */
export function useSaveBillMutation(
  options?: UseMutationOptions<
    SuccessResponse<SavedBill>,
    APIError<SaveBillParams>,
    SaveBillParams
  >
) {
  const queryClient = useQueryClient()
  return useMutation<
    SuccessResponse<SavedBill>,
    APIError<SaveBillParams>,
    SaveBillParams
  >({
    mutationFn: async (params) =>
      await fetcher<SavedBill>('/me/bills', {
        method: 'POST',
        body: JSON.stringify(params)
      }),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: SAVED_BILLS_KEY })
      return options?.onSuccess?.(...args)
    }
  })
}

/** PATCH /me/bills/:id */
export function useUpdateBillMutation(
  options?: UseMutationOptions<
    SuccessResponse<SavedBill>,
    APIError<UpdateBillParams>,
    UpdateBillParams
  >
) {
  const queryClient = useQueryClient()
  return useMutation<
    SuccessResponse<SavedBill>,
    APIError<UpdateBillParams>,
    UpdateBillParams
  >({
    mutationFn: async ({ id, ...body }) =>
      await fetcher<SavedBill>('/me/bills/' + id, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: SAVED_BILLS_KEY })
      return options?.onSuccess?.(...args)
    }
  })
}

/** DELETE /me/bills/:id (mutate with the bill id). */
export function useRemoveBillMutation(
  options?: UseMutationOptions<unknown, APIError, string>
) {
  const queryClient = useQueryClient()
  return useMutation<unknown, APIError, string>({
    mutationFn: async (id) =>
      await fetcher('/me/bills/' + id, { method: 'DELETE' }),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: SAVED_BILLS_KEY })
      return options?.onSuccess?.(...args)
    }
  })
}
