import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher.ts'
import { clearSession } from '@/lib/stores/auth-store.ts'
import { resetToken } from '@/lib/stores/token-store.ts'

/**
 * Best-effort POST /auth/logout; whatever the server answers, the local
 * session, the one-click token and the query cache are wiped.
 * The caller navigates away before calling mutate().
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        await fetcher('/auth/logout', { method: 'POST' })
      } catch {
        // best-effort: the local session is cleared anyway
      }
    },
    onSettled: () => {
      clearSession()
      resetToken()
      queryClient.clear()
    }
  })
}
