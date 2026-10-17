import { useZodSearchParams } from '@/hooks/use-zod-search-params.ts'
import { cn } from '@/lib/utils.ts'
import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { oneClickConfirmationSearchParamsSchema } from '../route-schemas.ts'
import { Loader } from '@/components/loader.tsx'
import { useFinishSetupMutation } from '@/hooks/use-finish-setup-mutation.ts'
import { setToken } from '@/lib/stores/token-store.ts'
import { paymentDraftStore } from '@/lib/stores/payment-draft-store.ts'

export function Component() {
  const navigate = useNavigate()
  const [{ identifier, hash, interact_ref, result }] = useZodSearchParams(
    oneClickConfirmationSearchParamsSchema
  )
  const { mutate, data, error } = useFinishSetupMutation()

  useEffect(() => {
    // A declined or invalid grant needs no backend call: just explain and go back.
    if (!result) {
      mutate(
        { identifier, hash, interactRef: interact_ref },
        {
          onSuccess({ result }) {
            if (result) setToken(result)
          }
        }
      )
    }
    const redirectTimer = setTimeout(
      () => navigate(paymentDraftStore.returnTo || '/servicios'),
      3000
    )
    return () => {
      clearTimeout(redirectTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (result || data) {
    let color: string = 'text-success'
    let text: string = '¡Pago en un clic configurado!'

    if (result === 'grant_rejected') {
      color = 'text-magenta'
      text = 'La configuración de pago en un clic fue cancelada.'
    } else if (result === 'grant_invalid') {
      color = 'text-magenta'
      text = 'No se pudo configurar el pago en un clic.'
    }

    return (
      <div
        className={cn(
          'flex w-full flex-1 flex-col items-center justify-center gap-4 px-2 py-16 text-center',
          color
        )}
      >
        <h1 className={`${color} text-xl font-bold leading-tight`}>{text}</h1>
        <p className="text-sm text-neutral-normal">Volviendo a tu pago…</p>
      </div>
    )
  }

  if (error) {
    return <Navigate to="/" />
  }

  return <Loader />
}
