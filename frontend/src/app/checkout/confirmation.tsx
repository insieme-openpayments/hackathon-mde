import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Actions,
  BrandFooter,
  Pasarela,
  Receipt,
  Screen,
  StatusTracker,
  SupportNote,
  TitleBox,
  type KvRow
} from '@/components/insieme'
import { Button } from '@/components/ui/button.tsx'
import { useZodSearchParams } from '@/hooks/use-zod-search-params.ts'
import { useFinishCheckoutMutation } from '@/hooks/use-finish-checkout-mutation.ts'
import {
  OrderStatus,
  useOrderQuery,
  type OrderReceipt
} from '@/hooks/use-order-query.ts'
import {
  clearPaymentDraft,
  paymentDraftStore
} from '@/lib/stores/payment-draft-store.ts'
import { formatDateTime, money, today } from '@/lib/money.ts'
import { getFactura, markPaid } from '@/lib/stores/facturas-store.ts'
import { checkoutConfirmationSearchParamsSchema } from '../route-schemas.ts'

const TIMEOUT_MS = 90_000
const LINK_CLASS =
  'self-center text-sm font-medium text-brand underline underline-offset-2'

function receiptRows(
  order: OrderReceipt,
  estado: { label: string; tone?: 'success' | 'error' }
): KvRow[] {
  const item = order.orderItems[0]
  const details = item?.details
  const rows: KvRow[] = [
    {
      label: 'Fecha y hora',
      value: formatDateTime(order.settlement?.paidAt ?? order.createdAt)
    },
    { label: 'Estado', value: estado.label, tone: estado.tone },
    { label: 'Operación', value: 'Pago de servicios' },
    {
      label: 'Número de autorización',
      value: order.settlement?.authCode ?? '—'
    },
    { label: 'ID transacción', value: order.id },
    { label: 'Convenio', value: item?.product?.name ?? '' },
    { label: 'Referencia de pago 1', value: details?.ref1 ?? '' }
  ]
  if (details?.ref2) {
    rows.push({ label: 'Referencia de pago 2', value: details.ref2 })
  }
  rows.push({ label: 'Total', value: money(order.total) })
  return rows
}

export function Component() {
  const navigate = useNavigate()
  const [{ orderId, interact_ref, result, hash }] = useZodSearchParams(
    checkoutConfirmationSearchParamsSchema
  )
  const { data, error, refetch } = useOrderQuery(orderId)
  const { mutate: finish } = useFinishCheckoutMutation(orderId)
  const order = data?.result
  const status = order?.status

  // Captured once: the draft is cleared when the order reaches a final state.
  const initialDraft = useRef({
    returnTo: paymentDraftStore.returnTo,
    facturaId: paymentDraftStore.facturaId,
    facturas:
      !!paymentDraftStore.facturaId || paymentDraftStore.kind === 'factura'
  })
  const patched = useRef(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  // Complete the interaction with the wallet (once, only while PROCESSING).
  useEffect(() => {
    if (
      patched.current ||
      status !== OrderStatus.PROCESSING ||
      !(interact_ref || result)
    ) {
      return
    }
    patched.current = true
    // Survive reloads: never re-send the same callback.
    const guardKey = `patched:${orderId}:${interact_ref ?? result}`
    try {
      if (sessionStorage.getItem(guardKey)) return
      sessionStorage.setItem(guardKey, '1')
    } catch {
      // sessionStorage unavailable: the backend is idempotent anyway
    }
    finish(
      { result, hash, interactRef: interact_ref },
      {
        onError: () => {
          // Let a reload retry: the backend callback is idempotent.
          try {
            sessionStorage.removeItem(guardKey)
          } catch {
            // ignore
          }
        },
        onSettled: () => void refetch()
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Saved invoice: record the last payment only once it was really paid.
  const markedPaid = useRef(false)
  useEffect(() => {
    const facturaId = initialDraft.current.facturaId
    if (status !== OrderStatus.SETTLED || !facturaId || markedPaid.current) {
      return
    }
    markedPaid.current = true
    if (getFactura(facturaId) && order) {
      markPaid(facturaId, order.total, today())
    }
  }, [status, order])

  useEffect(() => {
    if (
      status &&
      status !== OrderStatus.PROCESSING &&
      status !== OrderStatus.COMPLETED
    ) {
      clearPaymentDraft()
    }
  }, [status])

  if (error) return <Navigate to="/" />

  if (!order || !status) {
    return (
      <Screen>
        <Pasarela message="Cargando tu transacción…" />
      </Screen>
    )
  }

  const firstItem = order.orderItems[0]
  const isFacturas =
    initialDraft.current.facturas || firstItem?.details?.kind === 'factura'
  const retry =
    initialDraft.current.returnTo ||
    (isFacturas
      ? '/facturas'
      : firstItem?.productId
        ? `/servicios/pagar/${firstItem.productId}${
            firstItem.details?.ref1 ? `?ref1=${firstItem.details.ref1}` : ''
          }`
        : '/servicios')

  const homeLink = (
    <Link to="/" className={LINK_CLASS}>
      Volver al inicio
    </Link>
  )

  if (status === OrderStatus.PROCESSING || status === OrderStatus.COMPLETED) {
    return (
      <Screen>
        <TitleBox variant="plain">Procesando tu pago</TitleBox>
        <p className="text-center text-sm text-neutral-normal">
          Esto puede tardar unos segundos. No cierres esta pantalla.
        </p>
        <StatusTracker status={status} events={order.events} />
        {timedOut ? (
          <p className="text-center text-sm text-neutral-normal" role="status">
            La confirmación está tardando más de lo normal. Puedes volver más
            tarde con este mismo enlace.
          </p>
        ) : null}
        <BrandFooter />
      </Screen>
    )
  }

  if (status === OrderStatus.SETTLED) {
    return (
      <Screen>
        <Receipt
          title="¡Transacción exitosa!"
          rows={receiptRows(order, {
            label: 'Aprobada',
            tone: 'success'
          })}
        >
          <SupportNote />
          <div className="flex flex-col gap-3">
            {isFacturas ? (
              <Link to="/facturas" className={LINK_CLASS}>
                Ver mis facturas
              </Link>
            ) : null}
            {homeLink}
          </div>
          <BrandFooter />
        </Receipt>
      </Screen>
    )
  }

  if (status === OrderStatus.SETTLEMENT_FAILED) {
    return (
      <Screen>
        <Receipt
          title="No pudimos pagar la factura. Tu dinero queda registrado para reintento/reembolso."
          tone="warning"
          rows={receiptRows(order, { label: 'Pago recibido' })}
        >
          <SupportNote />
          {homeLink}
          <BrandFooter />
        </Receipt>
      </Screen>
    )
  }

  const rejected = status === OrderStatus.REJECTED
  return (
    <Screen>
      <Receipt
        title={rejected ? 'Transacción rechazada' : 'Transacción fallida'}
        tone="error"
        subtitle={
          rejected ? undefined : (
            <p className="text-center text-sm">
              Verifica tus fondos e inténtalo de nuevo.
            </p>
          )
        }
        rows={receiptRows(order, {
          label: rejected ? 'Rechazada' : 'Fallida',
          tone: 'error'
        })}
      >
        <Actions>
          <Button
            type="button"
            aria-label="Intentar de nuevo"
            className="flex-1"
            onClick={() => navigate(retry)}
          >
            Intentar de nuevo
          </Button>
        </Actions>
        {homeLink}
        <SupportNote />
        <BrandFooter />
      </Receipt>
    </Screen>
  )
}
