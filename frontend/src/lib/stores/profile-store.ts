// Last used email / wallet address (no registration required).
// Owner: P2 (data-stores).
import { valtioPersist } from '../valtio-persist'

export interface ProfileState {
  email: string
  walletAddressUrl: string
}

export const profileStore = valtioPersist<ProfileState>('profile-store', {
  email: '',
  walletAddressUrl: ''
})

export function setProfile(patch: Partial<ProfileState>): void {
  Object.assign(profileStore, patch)
}
