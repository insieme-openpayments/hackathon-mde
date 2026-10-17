import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { MeResponse } from '@insieme/shared'
import { fetcher, APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import { useSession } from './use-auth.ts'

/** GET /me; only runs with a session. `data.result.grant` is the saved one-click grant (or null). */
export function useMeQuery(): UseQueryResult<
  SuccessResponse<MeResponse>,
  APIError
> {
  const { token } = useSession()
  return useQuery({
    queryKey: ['me'],
    enabled: token !== '',
    queryFn: async () => await fetcher<MeResponse>('/me', { method: 'GET' })
  })
}
