// Sesión de la cuenta Insieme (opcional): token Bearer + datos básicos.
import { z } from 'zod'
import type { AccountUser } from '@insieme/shared'
import { valtioPersist } from '../valtio-persist'
import { loadGuard } from './load-guard'

export interface AuthState {
  token: string
  user: AccountUser | null
}

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  document: z.string(),
  email: z.string(),
  phone: z.string(),
  createdAt: z.string()
})

const schema = z.object({
  token: z.string(),
  user: userSchema.nullable()
})
const KEY = 'auth-store'

loadGuard(KEY, schema)

export const authStore = valtioPersist<AuthState>(KEY, {
  token: '',
  user: null
})

export function setSession(args: { token: string; user: AccountUser }): void {
  authStore.token = args.token
  authStore.user = args.user
}

export function clearSession(): void {
  authStore.token = ''
  authStore.user = null
}

export function getAuthToken(): string {
  return authStore.token
}
