import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetcher, type APIError } from '@/lib/fetcher.ts'

/** DELETE /me/grant: unlinks the one-click grant stored in the account. */
export function useClearGrantMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, APIError, void>({
    mutationFn: async () => await fetcher('/me/grant', { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    }
  })
}
