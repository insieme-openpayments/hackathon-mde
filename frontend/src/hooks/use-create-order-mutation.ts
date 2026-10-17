import { APIError } from '@/lib/fetcher.ts'
import { SuccessResponse } from '@/lib/types.ts'
import { UseMutationOptions } from '@tanstack/react-query'
import type { OrderItemInput } from '@/lib/api-types.ts'
import { useCustomMutation } from './use-custom-mutation.ts'

export type { OrderItemInput }

export interface CreateOrderMutationParams {
  walletAddressUrl: string
  /** Exactly one item. */
  products: [OrderItemInput]
}

export interface CreateOrderMutationResponse {
  redirectUrl: string
  orderId: string
}

/** API error keys are flat (`amount`, `ref1`, `email`, `walletAddressUrl`). */
export interface CreateOrderErrors {
  walletAddressUrl?: string
  amount?: string
  ref1?: string
  ref2?: string
  email?: string
  productId?: string
}

export function useCreateOrderMutation(
  options?: UseMutationOptions<
    SuccessResponse<CreateOrderMutationResponse>,
    APIError<CreateOrderErrors>,
    CreateOrderMutationParams
  >
) {
  return useCustomMutation({ endpoint: '/orders' }, options)
}
