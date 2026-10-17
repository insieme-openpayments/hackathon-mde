import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.tsx'
import { Shimmer } from '@/components/ui/shimmer.tsx'
import { useSavedDestinations } from '@/hooks/use-saved-destinations.ts'
import {
  destinationDetail,
  destinationHref,
  destinationKindLabel,
  destinationLastValue
} from './destination-utils.ts'

/** "Envíos rápidos": saved Efecty / Bre-B destinations, one tap to send again. */
export function QuickDestinations() {
  const navigate = useNavigate()
  const { data, isLoading, isError, isFetching, refetch } =
    useSavedDestinations()
  const destinations = data?.result ?? []

  return (
    <section className="flex flex-col gap-3" aria-label="Envíos rápidos">
      <h2 className="text-base font-bold text-neutral-darker">
        Envíos rápidos
      </h2>
      {isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Shimmer className="h-20 w-full rounded-2xl" />
          <Shimmer className="h-20 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-2xl border border-magenta bg-white p-4 text-sm text-neutral-darker"
        >
          <p>
            No pudimos cargar tus destinos guardados. Revisa tu conexión e
            intenta de nuevo.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Reintentar"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : destinations.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-soft-active bg-white p-4 text-sm text-neutral-normal">
          Guarda un destino al hacer tu primer giro o transferencia
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {destinations.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-brand bg-white p-3 shadow-soft"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-neutral-darker [overflow-wrap:anywhere]">
                  {d.label}
                </span>
                <span className="text-3xs font-medium text-brand">
                  {destinationKindLabel(d.kind)}
                </span>
                <span className="text-2xs text-neutral-normal [overflow-wrap:anywhere]">
                  {destinationDetail(d)}
                </span>
                <span className="text-2xs text-neutral-normal">
                  {destinationLastValue(d)}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                aria-label={`Enviar de nuevo a ${d.label}`}
                onClick={() => navigate(destinationHref(d))}
              >
                Enviar de nuevo
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
