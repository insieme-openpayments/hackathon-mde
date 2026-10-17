import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult
} from '@tanstack/react-query'
import { useMemo } from 'react'
import type { z } from 'zod'
import type {
  DestinationKind,
  SavedDestination,
  saveDestinationSchema,
  updateDestinationSchema
} from '@insieme/shared'
import { fetcher, type APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import { useSession } from './use-auth.ts'

export const SAVED_DESTINATIONS_KEY = ['me', 'destinations'] as const

export type SaveDestinationParams = z.input<typeof saveDestinationSchema>
export type UpdateDestinationParams = z.input<
  typeof updateDestinationSchema
> & { id: string }

/** GET /me/destinations (only with a session). */
export function useSavedDestinations(): UseQueryResult<
  SuccessResponse<SavedDestination[]>,
  APIError
> {
  const { token } = useSession()
  return useQuery({
    queryKey: SAVED_DESTINATIONS_KEY,
    enabled: token !== '',
    queryFn: async () =>
      await fetcher<SavedDestination[]>('/me/destinations', {
        method: 'GET'
      })
  })
}

/** Saved destinations of one kind (empty while loading or without session). */
export function useSavedDestinationsOfKind(
  kind: DestinationKind
): SavedDestination[] {
  const { data } = useSavedDestinations()
  return useMemo(
    () => (data?.result ?? []).filter((d) => d.kind === kind),
    [data, kind]
  )
}

/** POST /me/destinations: upsert by (kind, identity). */
export function useSaveDestinationMutation(
  options?: UseMutationOptions<
    SuccessResponse<SavedDestination>,
    APIError<SaveDestinationParams>,
    SaveDestinationParams
  >
) {
  const queryClient = useQueryClient()
  return useMutation<
    SuccessResponse<SavedDestination>,
    APIError<SaveDestinationParams>,
    SaveDestinationParams
  >({
    mutationFn: async (params) =>
      await fetcher<SavedDestination>('/me/destinations', {
        method: 'POST',
        body: JSON.stringify(params)
      }),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: SAVED_DESTINATIONS_KEY
      })
      return options?.onSuccess?.(...args)
    }
  })
}

/** PATCH /me/destinations/:id (label, lastAmount, lastUsedAt). */
export function useUpdateDestinationMutation(
  options?: UseMutationOptions<
    SuccessResponse<SavedDestination>,
    APIError<UpdateDestinationParams>,
    UpdateDestinationParams
  >
) {
  const queryClient = useQueryClient()
  return useMutation<
    SuccessResponse<SavedDestination>,
    APIError<UpdateDestinationParams>,
    UpdateDestinationParams
  >({
    mutationFn: async ({ id, ...body }) =>
      await fetcher<SavedDestination>('/me/destinations/' + id, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: SAVED_DESTINATIONS_KEY
      })
      return options?.onSuccess?.(...args)
    }
  })
}

/** DELETE /me/destinations/:id (mutate with the destination id). */
export function useRemoveDestinationMutation(
  options?: UseMutationOptions<unknown, APIError, string>
) {
  const queryClient = useQueryClient()
  return useMutation<unknown, APIError, string>({
    mutationFn: async (id) =>
      await fetcher('/me/destinations/' + id, { method: 'DELETE' }),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: SAVED_DESTINATIONS_KEY
      })
      return options?.onSuccess?.(...args)
    }
  })
}
