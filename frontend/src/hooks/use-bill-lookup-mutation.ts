// Owner: P2 (data-stores).
import type { UseMutationOptions } from '@tanstack/react-query'
import type { APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import type { BillLookupResult } from '@/lib/api-types.ts'
import { useCustomMutation } from './use-custom-mutation.ts'

export interface BillLookupParams {
  productId: string
  ref1: string
}

export interface BillLookupErrors {
  productId?: string
  ref1?: string
}

export function useBillLookupMutation(
  options?: UseMutationOptions<
    SuccessResponse<BillLookupResult>,
    APIError<BillLookupErrors>,
    BillLookupParams
  >
) {
  return useCustomMutation({ endpoint: '/bills/lookup' }, options)
}
