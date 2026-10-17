// Root error boundary. A lazy route chunk that no longer exists (the app was
// redeployed while this tab was open) is recovered by reloading once; any other
// error gets a friendly screen instead of the router's default message.
import { useEffect } from 'react'
import { useNavigate, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button.tsx'
import { Logo } from '@/components/insieme'

const RELOAD_FLAG = 'insieme-chunk-reload'
const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|Loading chunk|Loading CSS chunk/i

function isStaleChunkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  return CHUNK_ERROR.test(message)
}

const RELOAD_WINDOW_MS = 10_000

/** Reloads unless this tab already reloaded for the same reason moments ago. */
function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0)
    if (Date.now() - last < RELOAD_WINDOW_MS) return false
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
  } catch {
    // storage unavailable: still reload once per page life
  }
  window.location.reload()
  return true
}

export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  const stale = isStaleChunkError(error)

  useEffect(() => {
    if (stale) reloadOnce()
  }, [stale])

  return (
    <div className="flex min-h-full justify-center bg-page sm:px-4 sm:py-6">
      <div className="flex min-h-screen w-full max-w-app flex-col bg-white sm:min-h-0 sm:rounded-3xl sm:shadow-card">
        <header className="flex items-center bg-brand px-5 py-3 text-white sm:rounded-t-3xl">
          <Logo />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <h1 className="text-xl font-bold leading-tight text-neutral-darker">
            {stale ? 'Actualizando la aplicación…' : 'Algo salió mal'}
          </h1>
          <p className="text-sm text-neutral-normal">
            {stale
              ? 'Hay una versión nueva. Si esta pantalla no cambia, recarga la página.'
              : 'No pudimos mostrar esta pantalla. Vuelve al inicio e intenta de nuevo.'}
          </p>
          <Button
            aria-label="Ir al inicio"
            variant="dark"
            onClick={() => {
              if (stale) window.location.reload()
              else navigate('/')
            }}
          >
            {stale ? 'Recargar' : 'Ir al inicio'}
          </Button>
        </main>
      </div>
    </div>
  )
}
