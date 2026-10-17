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
    mutate(
      {
        identifier,
        hash,
        interactRef: interact_ref,
        result
      },
      {
        onSuccess({ result }) {
          setToken(result)
        }
      }
    )
    const redirectTimer = setTimeout(
      () => navigate(paymentDraftStore.returnTo || '/'),
      3000
    )
    return () => {
      clearTimeout(redirectTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (data) {
    let color: string = 'text-success'
    let text: string = 'Pago en un clic configurado con éxito'

    if (result === 'grant_rejected') {
      color = 'text-magenta'
      text = 'Se canceló la configuración del pago en un clic.'
    }

    return (
      <div
        className={cn(
          'mt-36 flex min-h-full w-full flex-col items-center gap-y-5',
          color
        )}
      >
        <h1 className={`${color} text-lg font-semibold`}>{text}</h1>
        <p className="font-semibold">Volviendo a tu pago ...</p>
      </div>
    )
  }

  if (error) {
    return <Navigate to={paymentDraftStore.returnTo || '/'} />
  }

  return <Loader />
}
