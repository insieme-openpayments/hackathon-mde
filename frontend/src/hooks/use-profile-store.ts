import { useSnapshot } from 'valtio'
import { profileStore } from '@/lib/stores/profile-store'

export function useProfileStore() {
  return useSnapshot(profileStore)
}
