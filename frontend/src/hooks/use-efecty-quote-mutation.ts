import type { UseMutationOptions } from '@tanstack/react-query'
import type { APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import type { EfectyQuote } from '@/lib/api-types.ts'
import { useCustomMutation } from './use-custom-mutation.ts'

export interface EfectyQuoteParams {
  recipientDocument: string
  recipientName: string
  recipientPhone?: string
  amount: number
}

export interface EfectyQuoteErrors {
  amount?: string
  recipientDocument?: string
  recipientName?: string
  recipientPhone?: string
}

export function useEfectyQuoteMutation(
  options?: UseMutationOptions<
    SuccessResponse<EfectyQuote>,
    APIError<EfectyQuoteErrors>,
    EfectyQuoteParams
  >
) {
  return useCustomMutation({ endpoint: '/efecty/quote' }, options)
}
