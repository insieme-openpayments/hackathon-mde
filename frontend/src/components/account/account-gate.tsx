import { useLocation, useNavigate } from 'react-router-dom'
import { Screen, TitleBox } from '@/components/insieme'
import { Button } from '@/components/ui/button.tsx'

const BENEFITS = [
  'Guarda tus facturas conocidas y págalas más rápido cada mes.',
  'Guarda los destinos de tus giros y transferencias para enviar con un clic.',
  'Deja activo el pago en un clic de tu billetera Interledger.'
]

/**
 * Pantalla para quien entra a una sección que requiere cuenta. Tras crear la
 * cuenta o ingresar vuelve a `next` (por defecto la ruta actual).
 */
export function AccountGate({ next }: { next?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const target = encodeURIComponent(next ?? pathname)

  return (
    <Screen className="gap-5">
      <TitleBox>Guarda tus facturas con una cuenta Insieme</TitleBox>
      <p className="text-sm leading-relaxed text-neutral-darker">
        Crear una cuenta es opcional y solo toma un minuto. Con ella tienes:
      </p>
      <ul className="flex flex-col gap-3">
        {BENEFITS.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-2xl border border-brand-soft-active bg-white p-3 text-sm text-neutral-darker"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-accent"
            />
            <span className="min-w-0 [overflow-wrap:anywhere]">{b}</span>
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-col gap-3">
        <Button
          type="button"
          aria-label="Crear cuenta"
          fullWidth
          onClick={() => navigate(`/cuenta/registro?next=${target}`)}
        >
          Crear cuenta
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label="Ingresar"
          fullWidth
          onClick={() => navigate(`/cuenta/ingresar?next=${target}`)}
        >
          Ingresar
        </Button>
      </div>
    </Screen>
  )
}
