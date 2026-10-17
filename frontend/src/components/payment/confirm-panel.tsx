// Fixed bottom confirmation panel. First "Confirmar" opens it; the second one
// either instant-buys (matching one-click token) or stores the payment draft,
// creates the order and redirects to the wallet.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Actions,
  BackButton,
  FloatingInput,
  KvRows
} from '@/components/insieme'
import type { KvRow } from '@/components/insieme'
import { Button } from '@/components/ui/button.tsx'
import { OneClickSetupDialog } from '@/components/payment/one-click-setup-dialog.tsx'
import { useZodForm } from '@/hooks/use-zod-form.ts'
import { useCreateOrderMutation } from '@/hooks/use-create-order-mutation.ts'
import { useInstantBuyMutation } from '@/hooks/use-instant-buy-mutation.ts'
import { useTokenStore } from '@/hooks/use-token-store.ts'
import { useProfileStore } from '@/hooks/use-profile-store.ts'
import { toast } from '@/hooks/use-toast.tsx'
import { setProfile } from '@/lib/stores/profile-store.ts'
import { resetToken } from '@/lib/stores/token-store.ts'
import { setPaymentDraft } from '@/lib/stores/payment-draft-store.ts'
import { confirmWalletSchema } from '@/lib/schemas.ts'
import { cn } from '@/lib/utils.ts'
import type {
  OrderItemDetails,
  OrderItemInput,
  OrderItemKind
} from '@/lib/api-types.ts'

export interface ConfirmPanelProps {
  /** Rows of the "Confirma la transacción" summary. */
  rows: KvRow[]
  /** Whole COP units to charge. */
  amount: number
  productId: string
  kind: OrderItemKind
  details: OrderItemDetails
  /** Saved invoice being paid (facturas flow); the confirmation page marks it paid once SETTLED. */
  facturaId?: string
  /** "Confirmar" is clickable. */
  enabled: boolean
  /** Called when "Confirmar" is pressed while not enabled (show field errors). */
  onInvalid?: () => void
  onBack: () => void
  /** Called with the new order id once the order was created. */
  onCreated?: (orderId: string) => void
}

const normalizeWallet = (url: string) =>
  url.trim().replace('$', 'https://').replace(/\/+$/, '').toLowerCase()

const FIELD_KEYS = ['walletAddressUrl', 'amount', 'ref1', 'ref2', 'email']

export function ConfirmPanel({
  rows,
  amount,
  productId,
  kind,
  details,
  facturaId,
  enabled,
  onInvalid,
  onBack,
  onCreated
}: ConfirmPanelProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useTokenStore()
  const profile = useProfileStore()
  const [open, setOpen] = useState(false)

  const form = useZodForm({
    schema: confirmWalletSchema,
    defaultValues: {
      walletAddressUrl: token.walletAddressUrl || profile.walletAddressUrl || ''
    }
  })
  const walletValue = form.watch('walletAddressUrl') ?? ''
  const hasMatchingToken =
    !!token.accessToken &&
    !!token.manageUrl &&
    !!walletValue &&
    normalizeWallet(token.walletAddressUrl) === normalizeWallet(walletValue)

  const returnTo = location.pathname + location.search

  const writeDraft = () =>
    setPaymentDraft({
      productId,
      ref1: details.ref1,
      ref2: details.ref2 ?? '',
      amount,
      email: details.email ?? '',
      kind,
      facturaId: facturaId ?? '',
      returnTo
    })

  const item: OrderItemInput = {
    productId,
    quantity: 1,
    kind,
    amount,
    details
  }

  const setApiErrors = (
    errors: Record<string, string> | undefined,
    message: string
  ) => {
    let mapped = false
    for (const [path, msg] of Object.entries(errors ?? {})) {
      const key = path.split('.').pop() ?? path
      if (key === 'walletAddressUrl') {
        form.setError('walletAddressUrl', { message: msg })
      } else {
        form.setError('root', { message: msg })
      }
      mapped = true
    }
    if (!mapped) form.setError('root', { message })
  }

  const onSaved = (walletAddressUrl: string, orderId: string) => {
    setProfile({
      walletAddressUrl,
      ...(details.email ? { email: details.email } : {})
    })
    onCreated?.(orderId)
  }

  const createOrder = useCreateOrderMutation({
    onError: ({ message, errors }) => setApiErrors(errors, message)
  })

  const instantBuy = useInstantBuyMutation()

  const submitRedirect = (walletAddressUrl: string) => {
    writeDraft()
    createOrder.mutate(
      { walletAddressUrl, products: [item] },
      {
        onSuccess({ result }) {
          onSaved(walletAddressUrl, result.orderId)
          window.location.href = result.redirectUrl
        }
      }
    )
  }

  const submit = ({ walletAddressUrl }: { walletAddressUrl: string }) => {
    if (!hasMatchingToken) {
      submitRedirect(walletAddressUrl)
      return
    }
    writeDraft()
    instantBuy.mutate(
      {
        walletAddressUrl,
        products: [item],
        accessToken: token.accessToken,
        manageUrl: token.manageUrl
      },
      {
        onSuccess({ result }) {
          onSaved(walletAddressUrl, result.orderId)
          navigate('/checkout/confirmation?orderId=' + result.orderId)
        },
        onError({ message, errors }) {
          const keys = Object.keys(errors ?? {})
          if (keys.some((k) => FIELD_KEYS.includes(k.split('.').pop() ?? k))) {
            setApiErrors(errors, message)
            return
          }
          // Token expired / limit exceeded: fall back to the redirect flow.
          resetToken()
          toast({
            variant: 'error',
            title: 'Pago en un clic no disponible',
            description: 'Autoriza el pago en tu billetera.'
          })
          submitRedirect(walletAddressUrl)
        }
      }
    )
  }

  const busy = createOrder.isPending || instantBuy.isPending
  const rootError = form.formState.errors.root?.message
  const walletError = form.formState.errors.walletAddressUrl?.message

  return (
    <section className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[420px] animate-sheet-up flex-col gap-3 bg-sheet p-4 shadow-sheet">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-center gap-1 text-2xs text-neutral-darker"
      >
        {open ? 'Ocultar detalles' : 'Ver detalles'}
        <img
          src={`/assets/icons/${open ? 'chevron-down-dark' : 'chevron-up'}.svg`}
          alt=""
          width={16}
          height={16}
        />
      </button>
      <form
        className="flex flex-col gap-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!enabled) {
            onInvalid?.()
            return
          }
          if (!open) {
            setOpen(true)
            return
          }
          void form.handleSubmit(submit)(e)
        }}
      >
        {open ? (
          <>
            <h3 className="text-sm font-medium">Confirma la transacción</h3>
            <KvRows rows={rows} />
            <FloatingInput
              label="Billetera"
              placeholder="$ilp.interledger-test.dev/tu-billetera"
              autoComplete="off"
              inputMode="url"
              error={walletError}
              {...form.register('walletAddressUrl')}
            />
            {hasMatchingToken ? (
              <p className="text-2xs text-success">
                Pago en un clic activo para esta billetera: se pagará sin
                redirección
              </p>
            ) : null}
            {rootError ? (
              <p className="text-2xs text-magenta" role="alert">
                {rootError}
              </p>
            ) : null}
          </>
        ) : null}
        <Actions>
          <BackButton onClick={() => (open ? setOpen(false) : onBack())} />
          <Button
            type="submit"
            aria-label="Confirmar"
            variant={enabled && !busy ? 'active' : 'disabled'}
            aria-disabled={!enabled || busy}
            disabled={busy}
            className={cn('flex-1')}
          >
            Confirmar
          </Button>
        </Actions>
      </form>
      {open ? (
        <OneClickSetupDialog
          defaultWalletAddressUrl={walletValue}
          onBeforeRedirect={writeDraft}
          trigger={
            <button
              type="button"
              className="self-center text-2xs text-blue-normal underline"
            >
              Configurar pago en un clic
            </button>
          }
        />
      ) : null}
    </section>
  )
}
