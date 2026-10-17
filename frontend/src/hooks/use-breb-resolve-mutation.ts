import type { UseMutationOptions } from '@tanstack/react-query'
import type { APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import type { BrebKeyResolution } from '@/lib/api-types.ts'
import { useCustomMutation } from './use-custom-mutation.ts'

export interface BrebResolveParams {
  key: string
}

export interface BrebResolveErrors {
  key?: string
}

export function useBrebResolveMutation(
  options?: UseMutationOptions<
    SuccessResponse<BrebKeyResolution>,
    APIError<BrebResolveErrors>,
    BrebResolveParams
  >
) {
  return useCustomMutation({ endpoint: '/breb/resolve' }, options)
}
