import { APIError } from '@/lib/fetcher.ts'
import { SuccessResponse } from '@/lib/types.ts'
import { UseMutationOptions } from '@tanstack/react-query'
import { useCustomMutation } from './use-custom-mutation.ts'
import type {
  CreateOrderErrors,
  CreateOrderMutationParams
} from '@/hooks/use-create-order-mutation.ts'

export interface InstantBuyMutationParams extends CreateOrderMutationParams {
  accessToken: string
  manageUrl: string
}

export interface InstantBuyMutationResponse {
  accessToken: string
  manageUrl: string
  walletAddressUrl: string
  orderId: string
}

export function useInstantBuyMutation(
  options?: UseMutationOptions<
    SuccessResponse<InstantBuyMutationResponse>,
    APIError<CreateOrderErrors>,
    InstantBuyMutationParams
  >
) {
  return useCustomMutation(
    { endpoint: '/orders/instant-buy', method: 'POST' },
    options
  )
}
