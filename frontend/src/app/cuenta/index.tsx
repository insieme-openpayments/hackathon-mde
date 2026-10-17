import { Link, Navigate, useNavigate } from 'react-router-dom'
import { KvRows, Screen, TitleBox } from '@/components/insieme'
import {
  destinationDetail,
  destinationHref,
  destinationKindLabel,
  destinationLastValue
} from '@/components/account/destination-utils.ts'
import { Button } from '@/components/ui/button.tsx'
import { Shimmer } from '@/components/ui/shimmer.tsx'
import { useSession } from '@/hooks/use-auth.ts'
import { useClearGrantMutation } from '@/hooks/use-clear-grant-mutation.ts'
import { useLogoutMutation } from '@/hooks/use-logout-mutation.ts'
import { useMeQuery } from '@/hooks/use-me-query.ts'
import {
  useRemoveDestinationMutation,
  useSavedDestinations
} from '@/hooks/use-saved-destinations.ts'
import { toast } from '@/hooks/use-toast.tsx'

export function Component() {
  const navigate = useNavigate()
  const { isLoggedIn, user: storedUser } = useSession()
  const me = useMeQuery()
  const destinations = useSavedDestinations()
  const clearGrant = useClearGrantMutation()
  const removeDestination = useRemoveDestinationMutation()
  const logout = useLogoutMutation()

  if (!isLoggedIn) return <Navigate to="/cuenta/ingresar" replace />

  const user = me.data?.result.user ?? storedUser
  const grant = me.data?.result.grant ?? null

  const onClearGrant = () =>
    clearGrant.mutate(undefined, {
      onSuccess: () =>
        toast({ description: 'Pago en un clic desvinculado de tu cuenta.' }),
      onError: () =>
        toast({
          variant: 'error',
          description:
            'No pudimos desvincular el pago en un clic. Intenta de nuevo.'
        })
    })

  // Navigate first: clearing the session re-renders this page into the
  // <Navigate to="/cuenta/ingresar"> guard, which would unmount it before a
  // per-call onSettled could send the person home. The hook-level onSettled
  // (clearSession, resetToken, queryClient.clear) still runs after unmount.
  const onLogout = () => {
    navigate('/', { replace: true })
    logout.mutate()
  }

  return (
    <Screen className="gap-5">
      <TitleBox>Mi cuenta</TitleBox>

      {user ? (
        <KvRows
          rows={[
            { label: 'Nombre', value: user.name },
            { label: 'Documento', value: user.document },
            { label: 'Correo', value: user.email },
            { label: 'Celular', value: user.phone }
          ]}
        />
      ) : null}

      <section className="flex flex-col gap-2 rounded-2xl border border-brand-soft-active bg-white p-4">
        <h2 className="text-base font-bold text-neutral-darker">
          Pago en un clic
        </h2>
        {me.isLoading ? (
          <Shimmer className="h-10 w-full" />
        ) : grant ? (
          <>
            <p className="text-sm text-neutral-darker [overflow-wrap:anywhere]">
              Activo con la billetera{' '}
              <strong className="font-semibold">
                {grant.walletAddressUrl}
              </strong>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Desvincular"
              disabled={clearGrant.isPending}
              onClick={onClearGrant}
              className="self-start"
            >
              Desvincular
            </Button>
          </>
        ) : (
          <p className="text-sm text-neutral-normal">
            Al pagar con tu billetera, elige “Configurar pago en un clic” y
            quedará guardado en tu cuenta para pagar sin redirección.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-neutral-darker">
          Destinos guardados
        </h2>
        {destinations.isLoading ? (
          <Shimmer className="h-20 w-full rounded-2xl" />
        ) : destinations.isError ? (
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
              disabled={destinations.isFetching}
              onClick={() => void destinations.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : (destinations.data?.result ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-soft-active bg-white p-4 text-sm text-neutral-normal">
            Aún no tienes destinos guardados. Guarda uno al hacer tu primer giro
            o transferencia.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(destinations.data?.result ?? []).map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 rounded-2xl border border-brand-soft-active bg-white p-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
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
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    aria-label={`Enviar de nuevo a ${d.label}`}
                    onClick={() => navigate(destinationHref(d))}
                  >
                    Enviar de nuevo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Eliminar ${d.label}`}
                    disabled={
                      removeDestination.isPending &&
                      removeDestination.variables === d.id
                    }
                    onClick={() =>
                      removeDestination.mutate(d.id, {
                        onError: () =>
                          toast({
                            variant: 'error',
                            description:
                              'No pudimos eliminar el destino. Intenta de nuevo.'
                          })
                      })
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        to="/facturas"
        className="flex min-h-[48px] items-center justify-between rounded-xl bg-brand-soft px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft-active"
      >
        Mis facturas
        <span aria-hidden="true">→</span>
      </Link>

      <Button
        type="button"
        variant="outline"
        aria-label="Cerrar sesión"
        fullWidth
        disabled={logout.isPending}
        onClick={onLogout}
      >
        Cerrar sesión
      </Button>
    </Screen>
  )
}
