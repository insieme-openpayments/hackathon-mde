import { useNavigate } from 'react-router-dom'
import type { DestinationKind } from '@insieme/shared'
import { useSavedDestinationsOfKind } from '@/hooks/use-saved-destinations.ts'
import { cn } from '@/lib/utils.ts'
import { destinationDetail, destinationHref } from './destination-utils.ts'

/**
 * "Tus destinos guardados": compact list for step 1 of Giro Efecty / Bre-B.
 * Tapping one navigates to ?destino=<id>, which the page rehydrates from.
 * Renders nothing without a session or without saved destinations.
 */
export function SavedDestinationsPicker({
  kind,
  selectedId
}: {
  kind: DestinationKind
  selectedId?: string
}) {
  const navigate = useNavigate()
  const destinations = useSavedDestinationsOfKind(kind)
  if (destinations.length === 0) return null

  return (
    <section
      aria-label="Tus destinos guardados"
      className="flex w-full flex-col gap-2"
    >
      <h2 className="text-2xs font-semibold uppercase tracking-wide text-brand">
        Tus destinos guardados
      </h2>
      <ul className="flex flex-col gap-2">
        {destinations.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => navigate(destinationHref(d))}
              aria-label={`Usar destino ${d.label}`}
              aria-pressed={selectedId === d.id}
              className={cn(
                'flex w-full min-w-0 flex-col gap-0.5 rounded-2xl border bg-white px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                selectedId === d.id
                  ? 'border-brand bg-brand-soft'
                  : 'border-brand-soft-active hover:bg-brand-soft'
              )}
            >
              <span className="text-sm font-semibold text-neutral-darker [overflow-wrap:anywhere]">
                {d.label}
              </span>
              <span className="text-2xs text-neutral-normal [overflow-wrap:anywhere]">
                {destinationDetail(d)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
