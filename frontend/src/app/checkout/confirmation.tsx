import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Actions,
  BankBlock,
  Pasarela,
  Receipt,
  Screen,
  StatusTracker,
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
const LINK_CLASS = 'self-center text-2xs text-blue-normal underline'

function receiptRows(
  order: OrderReceipt,
  estado: { label: string; className?: string }
): KvRow[] {
  const item = order.orderItems[0]
  const details = item?.details
  const rows: KvRow[] = [
    {
      label: 'Fecha y hora',
      value: formatDateTime(order.settlement?.paidAt ?? order.createdAt)
    },
    { label: 'Estado', value: estado.label, className: estado.className },
    { label: 'Operación', value: 'Pago de servicios' },
    {
      label: 'Numero de autorización',
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
      { onSettled: () => void refetch() }
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
        <TitleBox>Procesando tu transacción</TitleBox>
        <StatusTracker status={status} events={order.events} />
        {timedOut ? (
          <p className="text-center text-xs text-neutral-normal" role="status">
            La confirmación está tardando; revisa el historial más tarde.
          </p>
        ) : null}
      </Screen>
    )
  }

  if (status === OrderStatus.SETTLED) {
    return (
      <Screen gray>
        <Receipt
          title="¡Transacción exitosa!"
          rows={receiptRows(order, {
            label: 'Aprobada',
            className: 'text-success'
          })}
        >
          <div className="flex flex-col items-center gap-2">
            <BankBlock className="items-center text-center" />
            <p className="text-center text-2xs">
              Línea de atención personalizada Davivienda en Bogotá: 3487881
              <br />
              Resto del Pais: 01 8000 960 505
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {isFacturas ? (
              <Link to="/facturas" className={LINK_CLASS}>
                Ver mis facturas
              </Link>
            ) : null}
            {homeLink}
          </div>
        </Receipt>
      </Screen>
    )
  }

  if (status === OrderStatus.SETTLEMENT_FAILED) {
    return (
      <Screen gray>
        <Receipt
          title="No pudimos pagar la factura. Tu dinero queda registrado para reintento/reembolso."
          tone="warning"
          rows={receiptRows(order, { label: 'Pago recibido' })}
        >
          {homeLink}
        </Receipt>
      </Screen>
    )
  }

  const rejected = status === OrderStatus.REJECTED
  return (
    <Screen gray>
      <Receipt
        title={rejected ? 'Transacción rechazada' : 'Transacción fallida'}
        tone="error"
        subtitle={
          rejected ? undefined : (
            <p className="text-center text-xs">
              Verifica tus fondos e inténtalo de nuevo.
            </p>
          )
        }
        rows={receiptRows(order, {
          label: rejected ? 'Rechazada' : 'Fallida',
          className: 'text-magenta'
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
      </Receipt>
    </Screen>
  )
}
