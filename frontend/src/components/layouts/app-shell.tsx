import { Link, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/insieme'

export function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-full justify-center bg-page">
      <main className="relative flex min-h-screen w-full max-w-[420px] flex-col gap-4 bg-white px-7 pb-8 pt-6">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="Insieme Payments">
            <Logo />
          </Link>
          {isHome ? null : (
            <Link to="/" className="text-xs text-blue-normal underline">
              Volver al inicio
            </Link>
          )}
        </header>
        <Outlet />
      </main>
    </div>
  )
}
