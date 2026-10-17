import { Outlet } from 'react-router-dom'
import { AccountGate } from '@/components/account/account-gate.tsx'
import { useSession } from '@/hooks/use-auth.ts'

/** Saved invoices need an account: anonymous visitors see the gate. */
export function Component() {
  const { isLoggedIn } = useSession()
  if (!isLoggedIn) return <AccountGate next="/facturas" />
  return <Outlet />
}
