import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils.ts'
import { Logo } from '@/components/insieme'
import { useSession } from '@/hooks/use-auth.ts'

const PILL =
  'rounded-pill border border-white/40 px-3 py-1.5 text-2xs font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const { isLoggedIn, user } = useSession()
  const firstName = user?.name.trim().split(/\s+/)[0] ?? ''

  return (
    <div className="flex min-h-full justify-center bg-page sm:px-4 sm:py-6">
      <div className="flex min-h-screen w-full max-w-app flex-col bg-white sm:min-h-0 sm:rounded-3xl sm:shadow-card">
        <header className="flex items-center justify-between bg-brand px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:rounded-t-3xl">
          <Link
            to="/"
            aria-label="Insieme, ir al inicio"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Logo />
          </Link>
          <nav aria-label="Navegación" className="flex items-center gap-2">
            {isHome ? null : (
              <Link to="/" className={PILL}>
                Inicio
              </Link>
            )}
            {isLoggedIn ? (
              <Link
                to="/cuenta"
                aria-label={firstName ? `Mi cuenta: ${firstName}` : undefined}
                className={cn(PILL, 'max-w-[120px] truncate bg-white/15')}
              >
                {firstName || 'Mi cuenta'}
              </Link>
            ) : (
              <Link to="/cuenta/ingresar" className={PILL}>
                Mi cuenta
              </Link>
            )}
          </nav>
        </header>
        <main className="relative flex w-full flex-1 flex-col gap-4 px-4 pb-8 pt-5 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
