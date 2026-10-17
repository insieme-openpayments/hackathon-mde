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
import type { OrderItemKind } from '@/lib/api-types.ts'
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

type Kind = OrderItemKind

const OPERATION: Record<Kind, string> = {
  servicio: 'Pago de servicios',
  factura: 'Pago de servicios',
  efecty: 'Giro Efecty',
  breb: 'Transferencia Bre-B'
}

function itemKind(order: OrderReceipt): Kind {
  const item = order.orderItems[0]
  const kind = item?.details?.kind
  if (kind) return kind
  const type = item?.product?.type
  if (type === 'giro') return 'efecty'
  if (type === 'transferencia') return 'breb'
  return 'servicio'
}

/** dd/mm/aaaa */
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function receiptRows(
  order: OrderReceipt,
  estado: { label: string; tone?: 'success' | 'error' }
): KvRow[] {
  const kind = itemKind(order)
  const item = order.orderItems[0]
  const details = item?.details
  const settlement = order.settlement
  const receipt = settlement?.receipt ?? null
  const when = {
    label: 'Fecha y hora',
    value: formatDateTime(settlement?.paidAt ?? order.createdAt)
  }
  const estadoRow: KvRow = {
    label: 'Estado',
    value: estado.label,
    tone: estado.tone
  }
  const rows: KvRow[] = []

  if (kind === 'efecty') {
    const fee = details?.fee ?? 0
    const total = details?.total ?? order.total
    rows.push(estadoRow)
    rows.push({ label: 'ID del giro', value: settlement?.authCode ?? '—' })
    rows.push({ label: 'Operación', value: OPERATION.efecty })
    rows.push({ label: 'Beneficiario', value: details?.recipientName ?? '' })
    if (details?.recipientDocument) {
      rows.push({ label: 'Cédula', value: details.recipientDocument })
    }
    if (details?.recipientPhone) {
      rows.push({ label: 'Celular', value: details.recipientPhone })
    }
    rows.push({ label: 'Valor del giro', value: money(total - fee) })
    rows.push({ label: 'Comisión', value: money(fee) })
    rows.push({ label: 'Total', value: money(total) })
    rows.push(when)
    if (receipt?.expiresAt) {
      rows.push({ label: 'Vence el', value: formatDate(receipt.expiresAt) })
    }
    rows.push({ label: 'ID transacción', value: order.id })
    return rows
  }

  if (kind === 'breb') {
    rows.push(estadoRow)
    rows.push({
      label: 'ID transacción',
      value: settlement?.authCode ?? order.id
    })
    rows.push({ label: 'Operación', value: OPERATION.breb })
    rows.push({
      label: 'Titular',
      value: receipt?.holderName ?? details?.holderName ?? ''
    })
    rows.push({ label: 'Banco', value: receipt?.bank ?? details?.bank ?? '' })
    rows.push({ label: 'Llave', value: details?.key ?? '' })
    rows.push({ label: 'Valor', value: money(order.total) })
    if (details?.description) {
      rows.push({ label: 'Descripción', value: details.description })
    }
    rows.push(when)
    return rows
  }

  rows.push(when, estadoRow)
  rows.push({ label: 'Operación', value: OPERATION[kind] })
  rows.push({
    label: 'Número de autorización',
    value: settlement?.authCode ?? '—'
  })
  rows.push({ label: 'ID transacción', value: order.id })
  rows.push({ label: 'Convenio', value: item?.product?.name ?? '' })
  rows.push({ label: 'Referencia de pago 1', value: details?.ref1 ?? '' })
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
  const kind = itemKind(order)
  const isFacturas =
    initialDraft.current.facturas || firstItem?.details?.kind === 'factura'
  const kindRoute =
    kind === 'efecty'
      ? '/giros'
      : kind === 'breb'
        ? '/breb'
        : isFacturas
          ? '/facturas'
          : firstItem?.productId
            ? `/servicios/pagar/${firstItem.productId}${
                firstItem.details?.ref1 ? `?ref1=${firstItem.details.ref1}` : ''
              }`
            : '/servicios'
  const retry = initialDraft.current.returnTo || kindRoute
  const lastError = [...order.events]
    .reverse()
    .find((e) => e.message.startsWith('Error de liquidación'))

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
        <StatusTracker status={status} kind={kind} events={order.events} />
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
    const receipt = order.settlement?.receipt ?? null
    const pending = receipt?.status === 'pending'
    const title =
      kind === 'efecty'
        ? '¡Giro creado!'
        : kind === 'breb'
          ? '¡Transferencia enviada!'
          : '¡Transacción exitosa!'
    const estado =
      kind === 'efecty'
        ? 'Disponible para reclamar'
        : kind === 'breb'
          ? 'Completada'
          : pending
            ? 'Pendiente'
            : 'Aprobada'
    return (
      <Screen>
        <Receipt
          title={title}
          subtitle={
            kind === 'efecty' && receipt?.message ? (
              <p>{receipt.message}</p>
            ) : undefined
          }
          rows={receiptRows(order, {
            label: estado,
            tone: pending ? undefined : 'success'
          })}
        >
          {kind === 'efecty' && receipt?.instructions ? (
            <div className="w-full rounded-2xl border border-brand-soft-active bg-white p-4 text-sm leading-snug text-neutral-darker shadow-soft">
              <p className="mb-1 font-semibold">Cómo reclamarlo</p>
              <p className="[overflow-wrap:anywhere]">{receipt.instructions}</p>
            </div>
          ) : null}
          <SupportNote />
          <div className="flex flex-col gap-3">
            {isFacturas && kind !== 'efecty' && kind !== 'breb' ? (
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
          title={
            kind === 'efecty'
              ? 'No pudimos crear el giro. Tu dinero queda registrado para reintento/reembolso.'
              : kind === 'breb'
                ? 'No pudimos enviar la transferencia. Tu dinero queda registrado para reintento/reembolso.'
                : 'No pudimos pagar la factura. Tu dinero queda registrado para reintento/reembolso.'
          }
          tone="warning"
          subtitle={
            lastError ? <p role="alert">{lastError.message}</p> : undefined
          }
          rows={receiptRows(order, { label: 'Pago recibido' })}
        >
          <SupportNote />
          {kind === 'servicio' || kind === 'factura' ? null : (
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
          )}
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
