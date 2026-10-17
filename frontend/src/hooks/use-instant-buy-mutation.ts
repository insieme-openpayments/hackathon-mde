import { APIError } from '@/lib/fetcher.ts'
import { SuccessResponse } from '@/lib/types.ts'
import { UseMutationOptions } from '@tanstack/react-query'
import { useCustomMutation } from './use-custom-mutation.ts'
import { toast } from '@/hooks/use-toast.tsx'
import { resetToken } from '@/lib/stores/token-store.ts'
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

/**
 * True when the one-click token is no longer usable (401 from the backend or
 * spending limit exceeded). The caller should fall back to the redirect flow.
 */
export function isInstantBuyTokenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return (
    message.includes('instant-buy is not valid') ||
    message.includes('spending limit exceeded') ||
    message.includes('unauthorized')
  )
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
    {
      ...options,
      onError: (...args) => {
        const [error] = args
        if (isInstantBuyTokenError(error)) {
          resetToken()
          toast({
            variant: 'error',
            description:
              'Tu pago en un clic ya no es válido. Te llevaremos a tu billetera para autorizar el pago.'
          })
        }
        return options?.onError?.(...args)
      }
    }
  )
}
