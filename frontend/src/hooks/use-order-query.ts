import { UseQueryResult, useQuery } from '@tanstack/react-query'
import { fetcher, APIError } from '@/lib/fetcher.ts'
import { SuccessResponse } from '@/lib/types.ts'
import { OrderStatus, type OrderReceipt } from '@/lib/api-types.ts'

export { OrderStatus }
export type { OrderReceipt }

export function useOrderQuery(
  id: string
): UseQueryResult<SuccessResponse<OrderReceipt>, APIError> {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async function () {
      return await fetcher<OrderReceipt>('/orders/' + id, {
        method: 'GET'
      })
    },
    // Poll while the order is moving: PROCESSING (waiting for the payer) and
    // COMPLETED (funds received, settlement pending).
    refetchInterval: (query) => {
      const status = query.state.data?.result?.status
      return !status ||
        status === OrderStatus.PROCESSING ||
        status === OrderStatus.COMPLETED
        ? 2000
        : undefined
    }
  })
}
