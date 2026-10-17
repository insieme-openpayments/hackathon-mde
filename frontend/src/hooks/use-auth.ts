import { useSnapshot } from 'valtio'
import type { AccountUser } from '@insieme/shared'
import { authStore } from '@/lib/stores/auth-store.ts'

export interface Session {
  token: string
  user: AccountUser | null
  isLoggedIn: boolean
}

export function useSession(): Session {
  const snap = useSnapshot(authStore)
  return {
    token: snap.token,
    user: snap.user as AccountUser | null,
    isLoggedIn: snap.token !== ''
  }
}
