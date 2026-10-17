// Last used email / wallet address (no registration required).
// Owner: P2 (data-stores).
import { valtioPersist } from '../valtio-persist'
import { loadGuard } from './load-guard'
import { z } from 'zod'

export interface ProfileState {
  email: string
  walletAddressUrl: string
}

const schema = z.object({ email: z.string(), walletAddressUrl: z.string() })
const KEY = 'profile-store'

loadGuard(KEY, schema)

export const profileStore = valtioPersist<ProfileState>(KEY, {
  email: '',
  walletAddressUrl: ''
})

export function setProfile(patch: Partial<ProfileState>): void {
  Object.assign(profileStore, patch)
}
